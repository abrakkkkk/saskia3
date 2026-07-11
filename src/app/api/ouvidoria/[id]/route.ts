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

    const ticket = await prisma.ouvidoriaTicket.findFirst({
      where: { id: id, hospitalId }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const atualizado = await prisma.ouvidoriaTicket.update({
      where: { id: id },
      data: {
        status: body.status
      }
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error("Erro ao atualizar ouvidoria:", error);
    return NextResponse.json({ error: 'Erro ao atualizar ouvidoria' }, { status: 500 });
  }
}
