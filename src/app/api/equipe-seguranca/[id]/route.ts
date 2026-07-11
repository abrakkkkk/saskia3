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

    const ocorrencia = await prisma.ocorrenciaSeguranca.findFirst({
      where: { id: id, hospitalId }
    });

    if (!ocorrencia) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
    }

    const atualizada = await prisma.ocorrenciaSeguranca.update({
      where: { id: id },
      data: {
        resolvido: body.resolvido,
        resolvidoPor: body.resolvidoPor,
        dataResolucao: body.dataResolucao ? new Date(body.dataResolucao) : undefined
      }
    });

    return NextResponse.json(atualizada);
  } catch (error: any) {
    console.error("Erro ao atualizar ocorrência:", error);
    return NextResponse.json({ error: 'Erro ao atualizar ocorrência' }, { status: 500 });
  }
}
