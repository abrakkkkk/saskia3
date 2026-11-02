import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'
import {
  comEspera, cpfEmUso, filtroPacientes, isUniqueConstraintError, SELECT_REFERENCIA_ESPERA, validarDadosPaciente,
} from '@/lib/pacientes'
import { STATUS_SAIDA } from '@/lib/utils'

const STATUS_ENTRADA = new Set(['Recepção', 'Internado'])

function inteiroDaQuery(valor: string | null, padrao: number, maximo: number) {
  const numero = Number.parseInt(valor ?? '', 10)
  return Number.isNaN(numero) || numero < 0 ? padrao : Math.min(numero, maximo)
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams

    if (params.get('visao') === 'painel-chamadas') {
      const { ator, negado } = await exigir('chamada:ler')
      if (negado) return negado
      const fila = await prisma.paciente.findMany({
        where: { hospitalId: ator.hospitalId, arquivadoEm: null, status: { notIn: [...STATUS_SAIDA] } },
        orderBy: { createdAt: 'desc' },
        take: LIMITE_LISTA,
        select: { id: true, status: true, classificacao: true, ...SELECT_REFERENCIA_ESPERA },
      })
      return NextResponse.json(fila.map(comEspera))
    }

    if (params.get('visao') === 'servico-social') {
      const { ator, negado } = await exigir('social:ler')
      if (negado) return negado
      const pacientes = await prisma.paciente.findMany({
        where: { hospitalId: ator.hospitalId, arquivadoEm: null },
        orderBy: { createdAt: 'desc' },
        take: LIMITE_LISTA,
        select: { id: true, nome: true },
      })
      return NextResponse.json(pacientes, {
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      })
    }

    const { ator, negado } = await exigir('paciente:listar')
    if (negado) return negado

    const arquivados = params.get('arquivados') === '1'
    if (arquivados && !pode(ator.cargo, 'paciente:arquivar')) {
      return NextResponse.json({ error: 'Sem permissão para consultar pacientes arquivados' }, { status: 403 })
    }

    // CPF só para quem atende ou cadastra o paciente. A busca por contato fica em /api/pacientes/busca.
    const veIdentificacao = pode(ator.cargo, 'paciente:cadastrar') || pode(ator.cargo, 'prontuario:ler')
    const where = filtroPacientes(params, ator.hospitalId, { arquivados, completa: false })
    const take = inteiroDaQuery(params.get('take') ?? params.get('limit'), LIMITE_LISTA, LIMITE_LISTA) || 1
    const skip = inteiroDaQuery(params.get('skip'), 0, Number.MAX_SAFE_INTEGER)

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true, nome: true, cpf: veIdentificacao, nascimento: true,
          status: true, classificacao: true, leitoTipo: true, leitoNumero: true,
          ...SELECT_REFERENCIA_ESPERA,
        },
      }),
      prisma.paciente.count({ where }),
    ])

    return NextResponse.json(pacientes.map(comEspera), { headers: { 'X-Total-Count': String(total) } })
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('paciente:cadastrar')
    if (negado) return negado

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome) return NextResponse.json({ error: 'O nome é obrigatório. Para não identificado, use "Desconhecido".' }, { status: 400 })
    if (body.classificacao !== undefined && body.classificacao !== null && body.classificacao !== '') {
      return NextResponse.json({ error: 'A classificação de risco é definida apenas na triagem' }, { status: 400 })
    }
    if (body.status !== undefined && (typeof body.status !== 'string' || !STATUS_ENTRADA.has(body.status))) {
      return NextResponse.json({ error: 'Status de entrada inválido' }, { status: 400 })
    }

    const validado = validarDadosPaciente({ ...body, classificacao: undefined })
    if (validado.erro !== undefined) return NextResponse.json({ error: validado.erro }, { status: 400 })
    const { dados } = validado

    if (dados.cpf && await cpfEmUso(ator.hospitalId, dados.cpf)) {
      return NextResponse.json({ error: 'Já existe paciente com este CPF neste hospital' }, { status: 409 })
    }

    const paciente = await prisma.$transaction(async tx => {
      const criado = await tx.paciente.create({
        data: {
          ...dados,
          nome,
          hospitalId: ator.hospitalId,
          ...(typeof body.status === 'string' ? { status: body.status } : {}),
        } as Prisma.PacienteUncheckedCreateInput,
        select: { id: true, nome: true, status: true },
      })
      await tx.timelineEvent.create({
        data: { pacienteId: criado.id, tipo: 'Cadastro', descricao: `Paciente cadastrado com status ${criado.status}`, user: ator.nome, usuarioId: ator.id },
      })
      return criado
    })

    await auditar(ator, 'CADASTRAR_PACIENTE', 'Paciente', paciente.id)
    return NextResponse.json(paciente, { status: 201 })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'Já existe paciente com este CPF neste hospital' }, { status: 409 })
    }
    console.error('Erro ao criar paciente:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 })
  }
}
