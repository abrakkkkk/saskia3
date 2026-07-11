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

    const modelo = await prisma.modeloProntuario.findFirst({
      where: { id, hospitalId }
    });
    if (!modelo) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const atualizado = await prisma.modeloProntuario.update({
      where: { id },
      data: {
        titulo: body.titulo !== undefined ? body.titulo : modelo.titulo,
        descricao: body.descricao !== undefined ? body.descricao : modelo.descricao,
        campos: body.campos !== undefined ? body.campos : modelo.campos
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
    const modelo = await prisma.modeloProntuario.findFirst({
      where: { id, hospitalId }
    });
    if (!modelo) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    await prisma.modeloProntuario.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
