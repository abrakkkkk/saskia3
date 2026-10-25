import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const input = body as Record<string, unknown>

    const agendamentoExistente = await prisma.agendamento.findFirst({ where: { id, hospitalId } })
    if (!agendamentoExistente) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const updateData: Prisma.AgendamentoUncheckedUpdateManyInput = {}
    for (const field of ['tipo', 'especialidade', 'profissional', 'sala', 'status', 'observacoes', 'pacienteId'] as const) {
      if (input[field] !== undefined) updateData[field] = input[field] as never
    }
    if (input.status !== undefined && !['AGENDADO', 'CONFIRMADO', 'EM_ESPERA', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU'].includes(String(input.status))) {
      return NextResponse.json({ error: 'Status de agendamento inválido' }, { status: 400 })
    }
    if (input.dataHora !== undefined) {
      if (typeof input.dataHora !== 'string') return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
      const dataHora = new Date(input.dataHora)
      if (Number.isNaN(dataHora.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
      updateData.dataHora = dataHora
    }
    if (typeof input.pacienteId === 'string') {
      const paciente = await prisma.paciente.findFirst({
        where: { id: input.pacienteId, hospitalId },
        select: { id: true },
      })
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.agendamento.updateMany({
      where: { id, hospitalId },
      data: updateData,
    })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    const agendamento = await prisma.agendamento.findFirst({ where: { id, hospitalId }, include: { paciente: true } })

    return NextResponse.json(agendamento)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    
    const agendamentoExistente = await prisma.agendamento.findFirst({ where: { id, hospitalId } })
    if (!agendamentoExistente) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const removido = await prisma.agendamento.deleteMany({ where: { id, hospitalId } })
    if (removido.count === 0) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir agendamento' }, { status: 500 })
  }
}
