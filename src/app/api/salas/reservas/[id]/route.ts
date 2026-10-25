import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const reserva = await prisma.$transaction(async (tx) => {
      const existente = await tx.reservaSala.findFirst({
        where: { id, hospitalId },
        select: { id: true, salaId: true },
      })
      if (!existente) return null

      const atualizada = await tx.reservaSala.update({
        where: { id: existente.id, hospitalId },
        data: { status: body.status }
      })

      // Se finalizar ou cancelar a reserva, liberamos a sala
      if (body.status === 'FINALIZADA' || body.status === 'CANCELADA') {
        await tx.sala.updateMany({
          where: { id: atualizada.salaId, hospitalId },
          data: { status: 'LIVRE' }
        })
      }

      return atualizada
    })

    if (!reserva) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })

    return NextResponse.json(reserva)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
