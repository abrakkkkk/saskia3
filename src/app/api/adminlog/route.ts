import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

  try {
    const data = await prisma.adminLog.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar registros administrativos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    typeof body.acao !== 'string' ||
    !body.acao.trim() ||
    body.acao.length > 120 ||
    (body.detalhes !== undefined && body.detalhes !== null && (typeof body.detalhes !== 'string' || body.detalhes.length > 2000))
  ) {
    return NextResponse.json({ error: 'Registro administrativo inválido' }, { status: 400 });
  }

  try {
    const data = await prisma.adminLog.create({
      data: {
        hospitalId,
        usuario: session.user.name || session.user.email || 'Usuário',
        acao: body.acao.trim(),
        detalhes: typeof body.detalhes === 'string' ? body.detalhes : null,
      },
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar registro administrativo' }, { status: 500 });
  }
}
