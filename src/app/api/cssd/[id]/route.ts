import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

const fluxoStatus: Record<string, string> = {
  'Recepção': 'Limpeza',
  Limpeza: 'Preparo',
  Preparo: 'Esterilização',
  Esterilização: 'Pronto',
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    if (!isRecord(body) || typeof body.status !== 'string') {
      return NextResponse.json({ error: 'Status do lote inválido' }, { status: 400 });
    }

    const { id } = await params;
    const lote = await prisma.cssdLote.findFirst({
      where: { id, hospitalId },
      select: { id: true, status: true },
    });
    if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    const statusPermitido = body.status === 'Rejeitado'
      ? lote.status !== 'Pronto' && lote.status !== 'Rejeitado'
      : fluxoStatus[lote.status] === body.status;
    if (!statusPermitido) {
      return NextResponse.json({ error: 'Transição de status inválida para este lote' }, { status: 409 });
    }

    const atualizado = await prisma.cssdLote.updateMany({
      where: { id, hospitalId, status: lote.status },
      data: { status: body.status },
    });
    if (atualizado.count === 0) {
      return NextResponse.json({ error: 'O lote mudou de status. Atualize a tela e tente novamente.' }, { status: 409 });
    }

    return NextResponse.json(await prisma.cssdLote.findFirst({ where: { id, hospitalId }, include: { itens: true } }));
  } catch (error) {
    console.error('Erro ao atualizar lote CSSD:', error);
    return NextResponse.json({ error: 'Erro ao atualizar lote CSSD' }, { status: 500 });
  }
}
