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

    const cirurgia = await prisma.cirurgia.findFirst({
      where: { id: id, hospitalId }
    });

    if (!cirurgia) {
      return NextResponse.json({ error: 'Cirurgia não encontrada' }, { status: 404 });
    }

    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.sala !== undefined) data.sala = body.sala;
    if (body.equipe !== undefined) data.equipe = body.equipe;
    if (body.observacoes !== undefined) data.observacoes = body.observacoes;
    if (body.dataHora !== undefined) data.dataHora = new Date(body.dataHora);

    const atualizada = await prisma.cirurgia.update({
      where: { id: id },
      data,
      include: {
        paciente: { select: { nome: true, cpf: true } }
      }
    });

    return NextResponse.json(atualizada);
  } catch (error: any) {
    console.error("Erro ao atualizar cirurgia:", error);
    return NextResponse.json({ error: 'Erro ao atualizar cirurgia' }, { status: 500 });
  }
}
