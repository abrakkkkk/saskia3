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

    const registro = await prisma.ccihRegistro.findFirst({
      where: { id, hospitalId }
    });
    if (!registro) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const atualizado = await prisma.ccihRegistro.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : registro.status,
        dados: body.dados !== undefined ? body.dados : registro.dados,
        descricao: body.descricao !== undefined ? body.descricao : registro.descricao,
        subtipo: body.subtipo !== undefined ? body.subtipo : registro.subtipo
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
    const registro = await prisma.ccihRegistro.findFirst({
      where: { id, hospitalId }
    });
    if (!registro) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    await prisma.ccihRegistro.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
