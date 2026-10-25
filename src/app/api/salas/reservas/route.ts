import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const reservas = await prisma.reservaSala.findMany({
      where: { hospitalId },
      orderBy: { data: 'desc' }
    })

    return NextResponse.json(reservas)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body = await request.json()

    const reserva = await prisma.$transaction(async (tx) => {
      const sala = await tx.sala.findFirst({
        where: { id: body.salaId, hospitalId },
        select: { id: true },
      })
      if (!sala) return null

      const nova = await tx.reservaSala.create({
        data: {
          hospitalId,
          salaId: body.salaId,
          profissional: body.profissional,
          paciente: body.paciente,
          data: body.data,
          horaInicio: body.horaInicio,
          horaFim: body.horaFim,
          status: 'ATIVA'
        }
      });

      const agora = new Date()
      const hojeStr = agora.toISOString().split('T')[0]
      if (body.data === hojeStr) {
        const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        if (horaAtual >= body.horaInicio && horaAtual <= body.horaFim) {
          await tx.sala.updateMany({
            where: { id: sala.id, hospitalId },
            data: { status: 'OCUPADO' }
          })
        }
      }

      return nova;
    })

    if (!reserva) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

    return NextResponse.json(reserva, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
