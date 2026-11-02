import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { isTerminal } from '@/lib/paciente-status'
import { mensagemDeConflito } from '../conflito'
import { STATUS_AGENDAMENTO, STATUS_ENCERRADOS, TRANSICOES_AGENDAMENTO, type StatusAgendamento } from '../regras'

const limitesTexto = { tipo: 80, especialidade: 100, profissional: 120, sala: 80, observacoes: 1000 } as const
const PACIENTE_RESUMO = { select: { nome: true, cpf: true, telefone: true } } as const

function conflitoParalelo(error: unknown) {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'P2034'
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('agenda:gerir')
    if (negado) return negado
    const { hospitalId } = ator
    const { id } = await params

    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    // O paciente de um agendamento não muda: cancele e crie outro.
    if (Object.keys(input).some(chave => chave !== 'status' && chave !== 'dataHora' && !(chave in limitesTexto))) {
      return NextResponse.json({ error: 'Campo não permitido' }, { status: 400 })
    }

    const dados: Prisma.AgendamentoUncheckedUpdateManyInput = {}
    for (const campo of Object.keys(limitesTexto) as (keyof typeof limitesTexto)[]) {
      const valor = input[campo]
      if (valor === undefined) continue
      if (valor !== null && (typeof valor !== 'string' || valor.length > limitesTexto[campo])) {
        return NextResponse.json({ error: `Campo ${campo} inválido` }, { status: 400 })
      }
      dados[campo] = typeof valor === 'string' ? valor.trim() || null : null
    }

    let novoStatus: StatusAgendamento | undefined
    if (input.status !== undefined) {
      novoStatus = STATUS_AGENDAMENTO.find(s => s === input.status)
      if (!novoStatus) return NextResponse.json({ error: 'Status de agendamento inválido' }, { status: 400 })
      dados.status = novoStatus
    }

    let novaData: Date | undefined
    if (input.dataHora !== undefined) {
      if (typeof input.dataHora !== 'string' || input.dataHora.length > 40) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
      novaData = new Date(input.dataHora)
      if (Number.isNaN(novaData.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
      dados.dataHora = novaData
    }
    if (Object.keys(dados).length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })

    const resultado = await prisma.$transaction(async (tx) => {
      const atual = await tx.agendamento.findFirst({
        where: { id, hospitalId },
        select: { status: true, dataHora: true, profissional: true, sala: true, paciente: { select: { status: true } } },
      })
      if (!atual) return { erro: 'Agendamento não encontrado', status: 404 } as const

      if (novoStatus && novoStatus !== atual.status && !TRANSICOES_AGENDAMENTO[atual.status].includes(novoStatus)) {
        return { erro: `Não é possível passar de ${atual.status} para ${novoStatus}`, status: 409 } as const
      }
      if (novoStatus !== 'CANCELADO' && isTerminal(atual.paciente.status)) {
        return { erro: 'Paciente com óbito registrado: o agendamento só pode ser cancelado', status: 409 } as const
      }

      const editaRecurso = novaData !== undefined || input.profissional !== undefined || input.sala !== undefined
      if (editaRecurso) {
        if (STATUS_ENCERRADOS.includes(atual.status)) return { erro: 'Agendamento encerrado não pode ser alterado', status: 409 } as const
        const conflito = await mensagemDeConflito(tx, {
          hospitalId,
          ignorarId: id,
          dataHora: novaData ?? atual.dataHora,
          profissional: input.profissional !== undefined ? dados.profissional as string | null : atual.profissional,
          sala: input.sala !== undefined ? dados.sala as string | null : atual.sala,
        })
        if (conflito) return { erro: conflito, status: 409 } as const
      }

      const alterado = await tx.agendamento.updateMany({ where: { id, hospitalId, status: atual.status }, data: dados })
      if (alterado.count === 0) return { erro: 'O agendamento foi alterado por outra pessoa. Atualize a tela.', status: 409 } as const
      return { agendamento: await tx.agendamento.findFirst({ where: { id, hospitalId }, include: { paciente: PACIENTE_RESUMO } }), de: atual.status }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

    await auditar(ator, 'agendamento.atualizar', 'Agendamento', id, {
      campos: Object.keys(dados),
      ...(novoStatus ? { de: resultado.de, para: novoStatus } : {}),
    })
    return NextResponse.json(resultado.agendamento)
  } catch (error) {
    if (conflitoParalelo(error)) {
      return NextResponse.json({ error: 'A agenda mudou em paralelo. Atualize a tela e tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 })
  }
}

// Sem exclusão física: mantém o histórico e apenas cancela.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('agenda:gerir')
    if (negado) return negado
    const { id } = await params

    const atual = await prisma.agendamento.findFirst({ where: { id, hospitalId: ator.hospitalId }, select: { status: true } })
    if (!atual) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    if (!TRANSICOES_AGENDAMENTO[atual.status].includes('CANCELADO')) {
      return NextResponse.json({ error: 'Agendamento encerrado não pode ser cancelado' }, { status: 409 })
    }

    const alterado = await prisma.agendamento.updateMany({
      where: { id, hospitalId: ator.hospitalId, status: atual.status },
      data: { status: 'CANCELADO' },
    })
    if (alterado.count === 0) return NextResponse.json({ error: 'O agendamento foi alterado por outra pessoa. Atualize a tela.' }, { status: 409 })

    await auditar(ator, 'agendamento.cancelar', 'Agendamento', id, { de: atual.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 })
  }
}
