import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const exames = await prisma.exame.findMany({
      where: { hospitalId },
      include: {
        paciente: {
          select: { nome: true, cpf: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(exames)
  } catch (error) {
    console.error('Erro ao buscar exames:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.pacienteId || !body.nome || !body.tipo) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const exame = await prisma.exame.create({
      data: {
        hospitalId,
        pacienteId: body.pacienteId,
        tipo: body.tipo,
        nome: body.nome,
        status: 'SOLICITADO',
        profissional: session.user.name || 'Médico',
        observacoes: body.observacoes || null
      },
      include: {
        paciente: true
      }
    })

    return NextResponse.json(exame, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar exame:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar exame'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
