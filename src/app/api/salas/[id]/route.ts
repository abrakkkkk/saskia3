import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const sala = await prisma.sala.update({
      where: { id },
      data: {
        status: body.status,
      }
    })

    return NextResponse.json(sala)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
