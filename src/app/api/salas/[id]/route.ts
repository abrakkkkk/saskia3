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

    const sala = await prisma.sala.updateMany({
      where: { id, hospitalId },
      data: {
        status: body.status,
      }
    })

    if (sala.count === 0) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

    const atualizada = await prisma.sala.findFirst({ where: { id, hospitalId } })
    return NextResponse.json(atualizada)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
