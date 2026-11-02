import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';
import { isTerminal } from '@/lib/paciente-status';
import { STATUS_CIRURGIA, TRANSICOES_CIRURGIA, type StatusCirurgia } from '../regras';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('cirurgia:gerir');
    if (negado) return negado;
    const { hospitalId } = ator;

    const { id } = await params;
    if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

    const body = await lerJson(request);
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    if (Object.keys(body).length !== 1 || typeof body.status !== 'string' || !STATUS_CIRURGIA.includes(body.status as StatusCirurgia)) {
      return NextResponse.json({ error: 'Informe somente um status válido' }, { status: 400 });
    }
    const nextStatus = body.status as StatusCirurgia;

    const cirurgia = await prisma.cirurgia.findFirst({
      where: { id, hospitalId },
      select: { id: true, status: true, updatedAt: true, paciente: { select: { status: true } } },
    });
    if (!cirurgia) return NextResponse.json({ error: 'Cirurgia não encontrada' }, { status: 404 });

    if (!TRANSICOES_CIRURGIA[cirurgia.status].includes(nextStatus)) {
      return NextResponse.json({ error: `Transição de ${cirurgia.status} para ${nextStatus} não permitida` }, { status: 409 });
    }
    if (nextStatus !== 'CANCELADA' && isTerminal(cirurgia.paciente.status)) {
      return NextResponse.json({ error: 'Paciente com óbito registrado: a cirurgia só pode ser cancelada' }, { status: 409 });
    }

    const result = await prisma.cirurgia.updateMany({
      where: { id, hospitalId, status: cirurgia.status, updatedAt: cirurgia.updatedAt },
      data: { status: nextStatus },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'A cirurgia foi alterada por outra pessoa. Atualize a tela e tente novamente.' }, { status: 409 });
    }

    const updated = await prisma.cirurgia.findFirst({
      where: { id, hospitalId },
      include: { paciente: { select: { nome: true } } },
    });
    if (!updated) return NextResponse.json({ error: 'Cirurgia não encontrada' }, { status: 404 });

    await auditar(ator, 'cirurgia.status', 'Cirurgia', id, { de: cirurgia.status, para: nextStatus });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar cirurgia' }, { status: 500 });
  }
}
