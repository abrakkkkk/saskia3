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
      where: { id, hospitalId, status: 'DENTRO' },
      data: { status: 'SAIU', saida: new Date() },
    });
    if (atualizado.count === 0) {
      const existente = await prisma.visitante.findFirst({ where: { id, hospitalId }, select: { id: true } });
      return existente
        ? NextResponse.json({ error: 'A saída deste visitante já foi registrada' }, { status: 409 })
        : NextResponse.json({ error: 'Visitante não encontrado' }, { status: 404 });
    }
    const visitante = await prisma.visitante.findFirst({ where: { id, hospitalId } });

    return NextResponse.json(visitante);
  } catch (error) {
    console.error('Erro ao atualizar visitante:', error);
    return NextResponse.json({ error: 'Erro ao registrar saída do visitante' }, { status: 500 });
  }
}
