import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const tickets = await prisma.ticket.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Erro ao buscar tickets:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.titulo || !body.descricao) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const ticket = await prisma.ticket.create({
      data: {
        hospitalId,
        titulo: body.titulo,
        descricao: body.descricao,
        prioridade: body.prioridade || 'MEDIA',
        status: 'ENVIADO',
        solicitante: session.user.name || 'Usuário do Sistema'
      }
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar ticket:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
