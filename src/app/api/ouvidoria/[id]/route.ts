import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const STATUS_PERMITIDOS = new Set(['ABERTO', 'EM_ANALISE', 'RESPONDIDA', 'ENCERRADA']);

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
    if (!isRecord(body) || typeof body.status !== 'string') return NextResponse.json({ error: 'Status inválido' }, { status: 400 });

    const status = body.status === 'Respondida' ? 'RESPONDIDA' : body.status;
    if (!STATUS_PERMITIDOS.has(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 });

    const atualizado = await prisma.ouvidoriaTicket.updateMany({ where: { id, hospitalId }, data: { status } });
    if (atualizado.count === 0) return NextResponse.json({ error: 'Manifestação não encontrada' }, { status: 404 });
    return NextResponse.json(await prisma.ouvidoriaTicket.findFirst({ where: { id, hospitalId } }));
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar manifestação' }, { status: 500 });
  }
}
