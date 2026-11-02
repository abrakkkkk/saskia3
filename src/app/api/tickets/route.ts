import { NextResponse } from 'next/server'
import type { PrioridadeTicket } from '@prisma/client'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'

const PRIORIDADES = new Set<string>(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'])

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const tickets = await prisma.ticket.findMany({
      where: pode(ator.cargo, 'admin:acesso') ? { hospitalId: ator.hospitalId } : { hospitalId: ator.hospitalId, creatorId: ator.id },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
      select: {
        id: true,
        numero: true,
        solicitante: true,
        titulo: true,
        descricao: true,
        status: true,
        prioridade: true,
        createdAt: true,
        respostas: true,
      },
    })
    return NextResponse.json(tickets, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body || typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.length > 160
    || typeof body.descricao !== 'string' || !body.descricao.trim() || body.descricao.length > 4000
    || (body.prioridade !== undefined && (typeof body.prioridade !== 'string' || !PRIORIDADES.has(body.prioridade)))) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  try {
    const ticket = await prisma.ticket.create({
      data: {
        hospitalId: ator.hospitalId,
        creatorId: ator.id,
        titulo: body.titulo.trim(),
        descricao: body.descricao.trim(),
        prioridade: (typeof body.prioridade === 'string' ? body.prioridade : 'MEDIA') as PrioridadeTicket,
        status: 'ENVIADO',
        solicitante: ator.nome,
      },
    })
    return NextResponse.json(ticket, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar ticket' }, { status: 500 })
  }
}
