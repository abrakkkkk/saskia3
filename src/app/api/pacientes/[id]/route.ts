import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode, type Permissao } from '@/lib/permissions'
import { isStatusPaciente, isTerminal, STATUS_DESFECHO, transicaoValida } from '@/lib/paciente-status'
import { cpfEmUso, isUniqueConstraintError, registrarEvento, SELECT_CADASTRO, validarDadosPaciente } from '@/lib/pacientes'

type Contexto = { params: Promise<{ id: string }> }

const recentes = { orderBy: { createdAt: 'desc' }, take: LIMITE_LISTA } as const

// Quem pode alterar cada campo. O que não está aqui é cadastro comum.
const PERMISSAO_DO_CAMPO: Record<string, Permissao> = {
  alergias: 'prontuario:dados-vitais',
  tipoSanguineo: 'prontuario:dados-vitais',
  classificacao: 'prontuario:dados-vitais',
  queixaPrincipal: 'prontuario:dados-vitais',
  leitoTipo: 'paciente:encaminhar',
  leitoNumero: 'paciente:encaminhar',
  consultorio: 'paciente:encaminhar',
}

export async function GET(_: NextRequest, { params }: Contexto) {
  try {
    const { ator, negado } = await exigir('paciente:listar')
    if (negado) return negado
    const { id } = await params
    const where = { id, hospitalId: ator.hospitalId, arquivadoEm: null }

    if (!pode(ator.cargo, 'prontuario:ler')) {
      const cadastro = await prisma.paciente.findFirst({ where, select: SELECT_CADASTRO })
      if (!cadastro) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      return NextResponse.json({ ...cadastro, acesso: 'cadastro' })
    }

    const paciente = await prisma.paciente.findFirst({
      where,
      include: {
        triagens: recentes,
        evolucoes: recentes,
        prescricoes: recentes,
        exames: recentes,
        sinaisVitais: recentes,
        escoresClinicos: recentes,
        avaliacoesNutri: recentes,
        avaliacoesMedicas: recentes,
        anotacoesEnf: recentes,
        timelineEvents: recentes,
      },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    await auditar(ator, 'LER_PRONTUARIO', 'Paciente', paciente.id)
    return NextResponse.json({ ...paciente, acesso: 'clinico' })
  } catch (error) {
    console.error('Erro ao ler paciente:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function paraAuditoria(valor: unknown): Prisma.InputJsonValue | null {
  if (valor instanceof Date) return valor.toISOString()
  return (valor ?? null) as Prisma.InputJsonValue | null
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  try {
    const { ator, negado } = await exigir('autenticado')
    if (negado) return negado
    const { id } = await params
    const hospitalId = ator.hospitalId

    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    if (Object.hasOwn(input, 'arquivadoEm')) {
      if (input.arquivadoEm !== null) return NextResponse.json({ error: 'Use null para restaurar o paciente' }, { status: 400 })
      if (!pode(ator.cargo, 'paciente:arquivar')) return NextResponse.json({ error: 'Sem permissão para restaurar pacientes' }, { status: 403 })
      const restaurado = await prisma.paciente.updateMany({
        where: { id, hospitalId, arquivadoEm: { not: null } },
        data: { arquivadoEm: null },
      })
      if (!restaurado.count) return NextResponse.json({ error: 'Paciente arquivado não encontrado' }, { status: 404 })
      await auditar(ator, 'RESTAURAR_PACIENTE', 'Paciente', id)
      return NextResponse.json({ success: true, arquivado: false })
    }

    const atual = await prisma.paciente.findFirst({ where: { id, hospitalId } })
    if (!atual) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    if (atual.arquivadoEm) return NextResponse.json({ error: 'Paciente arquivado: restaure antes de editar' }, { status: 409 })
    if (isTerminal(atual.status)) return NextResponse.json({ error: 'Paciente em Óbito: prontuário somente leitura' }, { status: 409 })

    const validado = validarDadosPaciente(input, atual)
    if (validado.erro !== undefined) return NextResponse.json({ error: validado.erro }, { status: 400 })
    const { dados } = validado

    let novoStatus: string | null = null
    if (input.status !== undefined && input.status !== atual.status) {
      if (input.status === 'Óbito') return NextResponse.json({ error: 'Óbito é registrado apenas no módulo de Óbitos' }, { status: 400 })
      if (!isStatusPaciente(input.status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      if (!pode(ator.cargo, 'paciente:encaminhar')) return NextResponse.json({ error: 'Sem permissão para encaminhar pacientes' }, { status: 403 })
      if (STATUS_DESFECHO.includes(input.status) && !pode(ator.cargo, 'prontuario:desfecho')) {
        return NextResponse.json({ error: 'Somente médico registra alta ou transferência' }, { status: 403 })
      }
      if (!transicaoValida(atual.status, input.status)) {
        return NextResponse.json({ error: `Transição inválida: ${atual.status} para ${input.status}` }, { status: 409 })
      }
      novoStatus = input.status
    }

    const campos = Object.keys(dados) as (keyof typeof dados)[]
    for (const campo of campos) {
      if (!pode(ator.cargo, PERMISSAO_DO_CAMPO[campo] ?? 'paciente:editar')) {
        return NextResponse.json({ error: `Sem permissão para alterar ${campo}` }, { status: 403 })
      }
    }

    if (campos.length === 0 && !novoStatus) {
      return NextResponse.json(await prisma.paciente.findFirst({ where: { id, hospitalId }, select: SELECT_CADASTRO }))
    }

    if (dados.cpf && await cpfEmUso(hospitalId, dados.cpf, id)) {
      return NextResponse.json({ error: 'Já existe paciente com este CPF neste hospital' }, { status: 409 })
    }

    // O status na condição barra alteração concorrente sobre um estado já vencido.
    const paciente = await prisma.$transaction(async tx => {
      const atualizado = await tx.paciente.updateMany({
        where: { id, hospitalId, arquivadoEm: null, status: atual.status },
        data: { ...dados, ...(novoStatus ? { status: novoStatus } : {}) } as Prisma.PacienteUpdateManyMutationInput,
      })
      if (atualizado.count === 0) return null
      if (novoStatus) await registrarEvento(tx, ator, id, 'Status', `${atual.status} para ${novoStatus}`)
      if (dados.classificacao !== undefined) {
        await registrarEvento(tx, ator, id, 'Classificação', `${atual.classificacao ?? 'Não classificado'} para ${dados.classificacao ?? 'Não classificado'}`)
      }
      return tx.paciente.findFirst({ where: { id, hospitalId }, select: SELECT_CADASTRO })
    })
    if (!paciente) return NextResponse.json({ error: 'O paciente foi alterado por outra pessoa. Recarregue a ficha.' }, { status: 409 })

    const alteracoes: Record<string, { de: Prisma.InputJsonValue | null; para: Prisma.InputJsonValue | null }> = {}
    for (const campo of campos) {
      alteracoes[campo] = { de: paraAuditoria(atual[campo as keyof typeof atual]), para: paraAuditoria(dados[campo]) }
    }
    if (novoStatus) alteracoes.status = { de: atual.status, para: novoStatus }
    await auditar(ator, 'ATUALIZAR_PACIENTE', 'Paciente', id, { alteracoes } as Prisma.InputJsonValue)

    return NextResponse.json(paciente)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'Já existe paciente com este CPF neste hospital' }, { status: 409 })
    }
    console.error('Erro ao atualizar paciente:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Contexto) {
  try {
    const { ator, negado } = await exigir('paciente:arquivar')
    if (negado) return negado
    const { id } = await params

    const arquivado = await prisma.paciente.updateMany({
      where: { id, hospitalId: ator.hospitalId, arquivadoEm: null },
      data: { arquivadoEm: new Date() },
    })
    if (arquivado.count === 0) return NextResponse.json({ error: 'Paciente não encontrado ou já arquivado' }, { status: 404 })

    await auditar(ator, 'ARQUIVAR_PACIENTE', 'Paciente', id)
    return NextResponse.json({ success: true, arquivado: true })
  } catch (error) {
    console.error('Erro ao arquivar paciente:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao arquivar' }, { status: 500 })
  }
}
