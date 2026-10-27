import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    if (!isRecord(body) || body.status !== 'Concluído') {
      return NextResponse.json({ error: 'Transição de transporte inválida' }, { status: 400 });
    }

    const atualizado = await prisma.transportePaciente.updateMany({
      where: { id, hospitalId, status: 'Pendente' },
      data: { status: 'Concluído' },
    });

    if (atualizado.count === 0) {
      const existente = await prisma.transportePaciente.findFirst({
        where: { id, hospitalId },
        select: { id: true },
      });
      if (!existente) return NextResponse.json({ error: 'Transporte não encontrado' }, { status: 404 });
      return NextResponse.json({ error: 'Este transporte já foi concluído' }, { status: 409 });
    }

    const transporte = await prisma.transportePaciente.findFirst({ where: { id, hospitalId } });
    return NextResponse.json(transporte);
  } catch (error) {
    console.error('Erro ao atualizar transporte:', error);
    return NextResponse.json({ error: 'Erro ao atualizar transporte' }, { status: 500 });
  }
}
