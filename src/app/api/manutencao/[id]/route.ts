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

    const os = await prisma.manutencaoOS.findFirst({
      where: { id: id, hospitalId }
    });

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
    }

    const atualizada = await prisma.manutencaoOS.update({
      where: { id: id },
      data: {
        status: body.status
      }
    });

    return NextResponse.json(atualizada);
  } catch (error: any) {
    console.error("Erro ao atualizar OS:", error);
    return NextResponse.json({ error: 'Erro ao atualizar OS' }, { status: 500 });
  }
}
