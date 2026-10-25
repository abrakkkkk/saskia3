import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    const lote = await prisma.cssdLote.findFirst({
      where: { id: id, hospitalId }
    });

    if (!lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const atualizado = await prisma.cssdLote.updateMany({
      where: { id, hospitalId },
      data: {
        status: body.status
      },
    });
    if (atualizado.count === 0) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.cssdLote.findFirst({ where: { id, hospitalId }, include: { itens: true } }));
  } catch (error: any) {
    console.error("Erro ao atualizar lote CSSD:", error);
    return NextResponse.json({ error: 'Erro ao atualizar lote CSSD' }, { status: 500 });
  }
}
