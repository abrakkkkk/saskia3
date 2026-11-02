import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { isTerminal } from '@/lib/paciente-status'
import { mensagemDeConflito } from './conflito'

const PACIENTE_RESUMO = { select: { nome: true, cpf: true, telefone: true } } as const

export async function GET() {
  try {
    const { ator, negado } = await exigir('agenda:ler')
    if (negado) return negado

    const agendamentos = await prisma.agendamento.findMany({
      where: { hospitalId: ator.hospitalId },
      include: { paciente: PACIENTE_RESUMO },
      orderBy: { dataHora: 'desc' },
      take: LIMITE_LISTA,
    })

    return NextResponse.json(agendamentos)
  } catch {
    console.error('Erro ao buscar agendamentos')
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('agenda:gerir')
    if (negado) return negado
    const { hospitalId } = ator

    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    if (typeof input.pacienteId !== 'string' || !input.pacienteId.trim()
      || typeof input.dataHora !== 'string' || input.dataHora.length > 40
      || typeof input.especialidade !== 'string' || !input.especialidade.trim() || input.especialidade.length > 100) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }
    const pacienteId = input.pacienteId.trim()
    const especialidade = input.especialidade.trim()

    const dataHora = new Date(input.dataHora)
    if (Number.isNaN(dataHora.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })

    const optionalText = (key: string, max: number) => {
      const value = input[key]
      return value == null ? undefined : typeof value === 'string' && value.length <= max ? value.trim() : null
    }
    const tipo = optionalText('tipo', 80)
    const profissional = optionalText('profissional', 120)
    const sala = optionalText('sala', 80)
    const observacoes = optionalText('observacoes', 1000)
    if ([tipo, profissional, sala, observacoes].includes(null)) {
      return NextResponse.json({ error: 'Um ou mais campos excedem o formato permitido' }, { status: 400 })
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.findFirst({
        where: { id: pacienteId, hospitalId, arquivadoEm: null },
        select: { id: true, status: true },
      })
      if (!paciente) return { erro: 'Paciente não encontrado', status: 404 } as const
      if (isTerminal(paciente.status)) return { erro: 'Paciente com óbito registrado não pode ser agendado', status: 409 } as const

      const conflito = await mensagemDeConflito(tx, { hospitalId, dataHora, profissional, sala })
      if (conflito) return { erro: conflito, status: 409 } as const

      return tx.agendamento.create({
        data: {
          hospitalId,
          pacienteId,
          usuarioId: ator.id,
          dataHora,
          tipo: tipo || 'Consulta',
          especialidade,
          profissional: profissional || null,
          sala: sala || null,
          status: 'AGENDADO',
          observacoes,
        },
        include: { paciente: PACIENTE_RESUMO },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

    await auditar(ator, 'agendamento.criar', 'Agendamento', resultado.id, { pacienteId })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'A agenda mudou em paralelo. Atualize a tela e tente novamente.' }, { status: 409 })
    }
    console.error('Erro ao criar agendamento')
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
  }
}
