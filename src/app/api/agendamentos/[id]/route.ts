import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

const limitesTexto = { tipo: 80, especialidade: 100, profissional: 120, sala: 80, observacoes: 1000 } as const
const statuses = ['AGENDADO', 'CONFIRMADO', 'EM_ESPERA', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU']

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const input = body

    const agendamentoExistente = await prisma.agendamento.findFirst({ where: { id, hospitalId } })
    if (!agendamentoExistente) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const updateData: Prisma.AgendamentoUncheckedUpdateManyInput = {}
    for (const field of ['tipo', 'especialidade', 'profissional', 'sala', 'status', 'observacoes', 'pacienteId'] as const) {
      if (input[field] === undefined) continue
      if (field === 'status') {
        if (typeof input.status !== 'string' || !statuses.includes(input.status)) {
          return NextResponse.json({ error: 'Status de agendamento inválido' }, { status: 400 })
        }
        updateData.status = input.status as Prisma.EnumStatusAgendamentoFieldUpdateOperationsInput['set']
      } else if (field === 'pacienteId') {
        if (typeof input.pacienteId !== 'string' || !input.pacienteId.trim()) {
          return NextResponse.json({ error: 'Paciente inválido' }, { status: 400 })
        }
        updateData.pacienteId = input.pacienteId.trim()
      } else {
        const value = input[field]
        const max = limitesTexto[field]
        if (value !== null && (typeof value !== 'string' || value.length > max)) {
          return NextResponse.json({ error: `Campo ${field} inválido` }, { status: 400 })
        }
        updateData[field] = typeof value === 'string' ? value.trim() : null
      }
    }
    if (input.dataHora !== undefined) {
      if (typeof input.dataHora !== 'string' || input.dataHora.length > 40) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
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
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
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
