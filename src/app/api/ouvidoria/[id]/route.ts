import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { hospitalId, cargo } = session.user;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    if (cargo !== 'ADMIN') return NextResponse.json({ error: 'Somente ADMIN pode atualizar manifestações' }, { status: 403 });

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
    if (!isRecord(body)
      || Object.keys(body).some(key => key !== 'status')
      || (body.status !== 'Respondida' && body.status !== 'RESPONDIDA')) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const atualizado = await prisma.ouvidoriaTicket.updateMany({
      where: { id, hospitalId, status: { in: ['ABERTO', 'EM_ANALISE'] } },
      data: { status: 'RESPONDIDA' },
    });
    if (atualizado.count === 0) {
      const existente = await prisma.ouvidoriaTicket.findFirst({ where: { id, hospitalId }, select: { id: true } });
      if (!existente) return NextResponse.json({ error: 'Manifestação não encontrada' }, { status: 404 });
      return NextResponse.json({ error: 'Esta manifestação já foi respondida ou encerrada' }, { status: 409 });
    }
    return NextResponse.json(await prisma.ouvidoriaTicket.findFirst({ where: { id, hospitalId } }));
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar manifestação' }, { status: 500 });
  }
}
