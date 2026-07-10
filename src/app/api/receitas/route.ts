import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const receitas = await prisma.receita.findMany({
      where: { hospitalId },
      include: {
        paciente: {
          select: { nome: true, cpf: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(receitas)
  } catch (error) {
    console.error('Erro ao buscar receitas:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.pacienteId || !body.medicamentos || body.medicamentos.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const receita = await prisma.receita.create({
      data: {
        hospitalId,
        pacienteId: body.pacienteId,
        medicamentos: body.medicamentos,
        observacoes: body.observacoes || null,
        profissional: session.user.name || 'Médico'
      },
      include: {
        paciente: true
      }
    })

    return NextResponse.json(receita, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar receita:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar receita'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
