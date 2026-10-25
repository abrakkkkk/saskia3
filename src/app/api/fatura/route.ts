import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { isRecord } from '@/lib/request-validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

    const data = await prisma.fatura.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const hospitalId = session.user.hospitalId;
    const valor = typeof body.valor === 'number' ? body.valor : Number(body.valor);
    const vencimento = typeof body.vencimento === 'string' ? new Date(body.vencimento) : new Date(Number.NaN);
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    if (!Number.isFinite(valor) || valor < 0 || valor > Number.MAX_SAFE_INTEGER || Number.isNaN(vencimento.getTime())) {
      return NextResponse.json({ error: 'Dados incompletos da fatura' }, { status: 400 });
    }

    const data = await prisma.fatura.create({
      data: {
        hospitalId,
        valor,
        vencimento,
        status: 'Pendente'
      }
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar fatura' }, { status: 500 });
  }
}
