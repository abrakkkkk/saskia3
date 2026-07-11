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

    const bolsa = await prisma.estoqueSangue.findFirst({
      where: { id: id, hospitalId }
    });

    if (!bolsa) {
      return NextResponse.json({ error: 'Estoque não encontrado' }, { status: 404 });
    }

    const novaQuantidade = body.quantidade;

    const atualizado = await prisma.estoqueSangue.update({
      where: { id: id },
      data: {
        quantidade: novaQuantidade,
        status: novaQuantidade < 5 ? 'CRÍTICO' : (novaQuantidade < 15 ? 'ALERTA' : 'NORMAL')
      }
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error("Erro ao atualizar banco de sangue:", error);
    return NextResponse.json({ error: 'Erro ao atualizar banco de sangue' }, { status: 500 });
  }
}
