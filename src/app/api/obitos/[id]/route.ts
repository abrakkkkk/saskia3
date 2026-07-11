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

    const obito = await prisma.obito.findFirst({
      where: { id: id, hospitalId }
    });

    if (!obito) {
      return NextResponse.json({ error: 'Óbito não encontrado' }, { status: 404 });
    }

    const atualizado = await prisma.obito.update({
      where: { id: id },
      data: {
        certidaoEmitida: body.certidaoEmitida
      }
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error("Erro ao atualizar óbito:", error);
    return NextResponse.json({ error: 'Erro ao atualizar óbito' }, { status: 500 });
  }
}
