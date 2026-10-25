import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const STATUSES = ['AGENDADA', 'EM_PREPARO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as const;
type StatusCirurgia = (typeof STATUSES)[number];

const TRANSITIONS: Record<StatusCirurgia, readonly StatusCirurgia[]> = {
  AGENDADA: ['EM_PREPARO', 'EM_ANDAMENTO', 'CANCELADA'],
  EM_PREPARO: ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO: ['CONCLUIDA', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!['ADMIN', 'MEDICO'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Apenas ADMIN ou MEDICO pode alterar o status de cirurgias' }, { status: 403 });
    }
    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const { id } = await params;
    if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    if (Object.keys(body).length !== 1 || typeof body.status !== 'string' || !STATUSES.includes(body.status as StatusCirurgia)) {
      return NextResponse.json({ error: 'Informe somente um status válido' }, { status: 400 });
    }
    const nextStatus = body.status as StatusCirurgia;

    const cirurgia = await prisma.cirurgia.findFirst({
      where: { id, hospitalId },
      select: { id: true, hospitalId: true, status: true, updatedAt: true },
    });
    if (!cirurgia) return NextResponse.json({ error: 'Cirurgia não encontrada' }, { status: 404 });

    if (!TRANSITIONS[cirurgia.status].includes(nextStatus)) {
      return NextResponse.json({ error: `Transição de ${cirurgia.status} para ${nextStatus} não permitida` }, { status: 409 });
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
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar cirurgia' }, { status: 500 });
  }
}
