import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const data = await request.json();

    const visitante = await prisma.visitante.update({
      where: { id },
      data: {
        status: 'SAIU',
        saida: new Date(),
        ...data
      }
    });

    return NextResponse.json(visitante);
  } catch (error: any) {
    console.error('Erro ao atualizar visitante:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
