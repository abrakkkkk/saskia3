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

    const cat = await prisma.categoria.findFirst({
      where: { id: id, hospitalId }
    });

    if (!cat) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    const atualizada = await prisma.categoria.update({
      where: { id: id },
      data: {
        nome: body.nome !== undefined ? body.nome : cat.nome,
        tipo: body.tipo !== undefined ? body.tipo : cat.tipo,
        descricao: body.descricao !== undefined ? body.descricao : cat.descricao
      }
    });

    return NextResponse.json(atualizada);
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
    const cat = await prisma.categoria.findFirst({
      where: { id: id, hospitalId }
    });

    if (!cat) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    await prisma.categoria.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
