import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    const body = await request.json()

    const agendamentoExistente = await prisma.agendamento.findFirst({ where: { id, hospitalId } })
    if (!agendamentoExistente) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const updateData: any = { ...body }
    if (updateData.dataHora) {
      updateData.dataHora = new Date(updateData.dataHora)
    }

    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: updateData,
      include: { paciente: true }
    })

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

    await prisma.agendamento.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir agendamento' }, { status: 500 })
  }
}
