import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const chamadas = await prisma.chamada.findMany({
      where: { hospitalId, status: 'ATIVA' },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return NextResponse.json(chamadas)
  } catch (error) {
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.pacienteNome || !body.consultorio) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const chamada = await prisma.chamada.create({
      data: {
        hospitalId,
        pacienteId: body.pacienteId || null,
        pacienteNome: body.pacienteNome,
        cpf: body.cpf || null,
        consultorio: body.consultorio,
        status: 'ATIVA'
      }
    })

    return NextResponse.json(chamada, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar chamada'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
