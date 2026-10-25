import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

  try {
    const data = await prisma.categoria.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
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
    typeof body.nome !== 'string' ||
    !body.nome.trim() ||
    body.nome.length > 100 ||
    (body.tipo !== undefined && (typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 60)) ||
    (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 1000))
  ) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
  }

  try {
    const data = await prisma.categoria.create({
      data: {
        hospitalId,
        nome: body.nome.trim(),
        tipo: typeof body.tipo === 'string' ? body.tipo.trim() : 'PRODUTO',
        descricao: typeof body.descricao === 'string' ? body.descricao : null,
      },
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
