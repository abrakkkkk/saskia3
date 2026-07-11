import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();

    const atualizado = await prisma.transportePaciente.update({
      where: { id: id },
      data: {
        status: body.status
      }
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar transporte' }, { status: 500 });
  }
}
