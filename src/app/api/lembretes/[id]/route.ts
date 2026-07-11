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

    const lembrete = await prisma.lembrete.findFirst({
      where: { id: id, hospitalId }
    });

    if (!lembrete) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    const atualizado = await prisma.lembrete.update({
      where: { id: id },
      data: {
        titulo: body.titulo !== undefined ? body.titulo : lembrete.titulo,
        descricao: body.descricao !== undefined ? body.descricao : lembrete.descricao,
        dataHora: body.dataHora ? new Date(body.dataHora) : (body.data ? new Date(body.data) : lembrete.dataHora),
        status: body.status !== undefined ? body.status : lembrete.status,
        tipo: body.tipo !== undefined ? body.tipo : lembrete.tipo,
        relacionado: body.relacionado !== undefined ? body.relacionado : lembrete.relacionado,
        concluido: body.concluido !== undefined ? body.concluido : lembrete.concluido
      }
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const lembrete = await prisma.lembrete.findFirst({
      where: { id: id, hospitalId }
    });

    if (!lembrete) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    await prisma.lembrete.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
