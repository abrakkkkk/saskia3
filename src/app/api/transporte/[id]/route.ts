import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();

    const atualizado = await prisma.transportePaciente.updateMany({
      where: { id, hospitalId: session.user.hospitalId },
      data: {
        status: body.status
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Transporte não encontrado' }, { status: 404 })

    const transporte = await prisma.transportePaciente.findFirst({
      where: { id, hospitalId: session.user.hospitalId },
    });
    return NextResponse.json(transporte);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar transporte' }, { status: 500 });
  }
}
