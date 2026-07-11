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

    const ticket = await prisma.ticket.findFirst({
      where: { id, hospitalId }
    });
    if (!ticket) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const atualizado = await prisma.ticket.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : ticket.status,
        prioridade: body.prioridade !== undefined ? body.prioridade : ticket.prioridade,
        respostas: body.respostas !== undefined ? body.respostas : ticket.respostas
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
    const ticket = await prisma.ticket.findFirst({
      where: { id, hospitalId }
    });
    if (!ticket) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    await prisma.ticket.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
