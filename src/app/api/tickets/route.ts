import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'
import { PrioridadeTicket } from '@prisma/client'

const PRIORIDADES = new Set<string>(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']);

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { hospitalId, id: userId, cargo } = session.user
    if (!hospitalId || !userId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 })
    const tickets = await prisma.ticket.findMany({
      where: cargo === 'ADMIN' ? { hospitalId } : { hospitalId, creatorId: userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Erro ao buscar tickets:', error)
    return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { hospitalId, id: userId } = session.user
    if (!hospitalId || !userId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 })
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }

    if (!isRecord(body) || typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.length > 160 || typeof body.descricao !== 'string' || !body.descricao.trim() || body.descricao.length > 4000 || (body.prioridade !== undefined && (typeof body.prioridade !== 'string' || !PRIORIDADES.has(body.prioridade)))) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const ticket = await prisma.ticket.create({
      data: {
        hospitalId,
        creatorId: userId,
        titulo: body.titulo.trim(),
        descricao: body.descricao.trim(),
        prioridade: (typeof body.prioridade === 'string' ? body.prioridade : 'MEDIA') as PrioridadeTicket,
        status: 'ENVIADO',
        solicitante: session.user.name || 'Usuário do Sistema'
      }
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar ticket:', error)
    return NextResponse.json({ error: 'Erro ao criar ticket' }, { status: 500 })
  }
}
