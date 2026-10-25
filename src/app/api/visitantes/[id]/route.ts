import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const atualizado = await prisma.visitante.updateMany({
      where: { id, hospitalId },
      data: { status: 'SAIU', saida: new Date() },
    });
    if (atualizado.count === 0) return NextResponse.json({ error: 'Visitante não encontrado' }, { status: 404 });
    const visitante = await prisma.visitante.findFirst({ where: { id, hospitalId } });

    return NextResponse.json(visitante);
  } catch (error: any) {
    console.error('Erro ao atualizar visitante:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
