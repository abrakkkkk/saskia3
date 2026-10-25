import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as { certidaoEmitida?: unknown }).certidaoEmitida !== 'boolean') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const obito = await prisma.obito.findFirst({
      where: { id: id, hospitalId }
    });

    if (!obito) {
      return NextResponse.json({ error: 'Óbito não encontrado' }, { status: 404 });
    }

    const atualizado = await prisma.obito.updateMany({
      where: { id, hospitalId },
      data: {
        certidaoEmitida: (body as { certidaoEmitida: boolean }).certidaoEmitida
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Óbito não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.obito.findFirst({ where: { id, hospitalId } }));
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar óbito' }, { status: 500 });
  }
}
