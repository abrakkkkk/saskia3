import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const body = await request.json();

    const exame = await prisma.exame.findFirst({
      where: { id: id, hospitalId }
    });

    if (!exame) {
      return NextResponse.json({ error: 'Exame não encontrado' }, { status: 404 });
    }

    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.resultado !== undefined) data.resultado = body.resultado;
    if (body.observacoes !== undefined) data.observacoes = body.observacoes;

    const atualizado = await prisma.exame.updateMany({
      where: { id, hospitalId },
      data,
    });
    if (atualizado.count === 0) return NextResponse.json({ error: 'Exame não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.exame.findFirst({ where: { id, hospitalId }, include: { paciente: { select: { nome: true, cpf: true } } } }));
  } catch (error: any) {
    console.error("Erro ao atualizar exame:", error);
    return NextResponse.json({ error: 'Erro ao atualizar exame' }, { status: 500 });
  }
}
