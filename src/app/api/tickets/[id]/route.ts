import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';
import { Prisma, PrioridadeTicket, StatusTicket } from '@prisma/client';

const PRIORIDADES = new Set<string>(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']);
const STATUS = new Set<string>(['ENVIADO', 'EM_ANALISE', 'RESOLVIDO', 'FECHADO']);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

    const { hospitalId, id: userId } = session.user;
    if (!hospitalId || !userId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!isRecord(body) || (!('status' in body) && !('prioridade' in body) && !('respostas' in body)) ||
      (body.status !== undefined && (typeof body.status !== 'string' || !STATUS.has(body.status))) ||
      (body.prioridade !== undefined && (typeof body.prioridade !== 'string' || !PRIORIDADES.has(body.prioridade))) ||
      (body.respostas !== undefined && body.respostas !== null && (!Array.isArray(body.respostas) || body.respostas.length > 100 || body.respostas.some(item => !isRecord(item) || typeof item.resposta !== 'string' || item.resposta.length > 4000 || typeof item.respondente !== 'string' || item.respondente.length > 120 || typeof item.data !== 'string' || Number.isNaN(new Date(item.data).getTime()))))) {
      return NextResponse.json({ error: 'Atualização de ticket inválida' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id, hospitalId }
    });
    if (!ticket) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const atualizado = await prisma.ticket.updateMany({
      where: { id, hospitalId },
      data: {
        ...(typeof body.status === 'string' ? { status: body.status as StatusTicket } : {}),
        ...(typeof body.prioridade === 'string' ? { prioridade: body.prioridade as PrioridadeTicket } : {}),
        ...(Array.isArray(body.respostas) ? { respostas: body.respostas as Prisma.InputJsonValue } : {})
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.ticket.findFirst({ where: { id, hospitalId } }));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { hospitalId, id: userId, cargo } = session.user;
    if (!hospitalId || !userId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });
    const where = cargo === 'ADMIN' ? { id, hospitalId } : { id, hospitalId, creatorId: userId };
    const removido = await prisma.ticket.deleteMany({ where });
    if (removido.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
