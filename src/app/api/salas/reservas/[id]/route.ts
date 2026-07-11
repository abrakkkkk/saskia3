import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const reserva = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.reservaSala.update({
        where: { id },
        data: { status: body.status }
      })

      // Se finalizar ou cancelar a reserva, liberamos a sala
      if (body.status === 'FINALIZADA' || body.status === 'CANCELADA') {
        await tx.sala.update({
          where: { id: atualizada.salaId },
          data: { status: 'LIVRE' }
        })
      }

      return atualizada
    })

    return NextResponse.json(reserva)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
