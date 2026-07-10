import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const leitos = await prisma.utiLeito.findMany({
      where: { hospitalId },
      orderBy: { numero: 'asc' },
    })

    return NextResponse.json(leitos)
  } catch (error) {
    console.error('Erro ao buscar leitos:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.numero || !body.tipo) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const leito = await prisma.utiLeito.create({
      data: {
        hospitalId,
        numero: Number(body.numero),
        tipo: body.tipo,
        status: body.status || 'LIVRE',
        pacienteNome: body.pacienteNome || null,
        pacienteCpf: body.pacienteCpf || null
      }
    })

    return NextResponse.json(leito, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar leito:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar leito'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
