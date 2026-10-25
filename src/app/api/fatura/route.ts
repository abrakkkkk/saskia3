import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

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

    const body = await request.json();
    const hospitalId = session.user.hospitalId;
    const valor = Number(body.valor);
    const vencimento = new Date(body.vencimento);
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    if (!Number.isFinite(valor) || valor < 0 || !body.vencimento || Number.isNaN(vencimento.getTime())) {
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
