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
    const data = await prisma.procedimento.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar procedimentos' }, { status: 500 });
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
    body.nome.length > 120 ||
    (body.codigo !== undefined && body.codigo !== null && (typeof body.codigo !== 'string' || body.codigo.length > 60)) ||
    (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) ||
    (body.valorBase !== undefined && body.valorBase !== null && (typeof body.valorBase !== 'number' || !Number.isFinite(body.valorBase) || body.valorBase < 0)) ||
    (body.ativo !== undefined && typeof body.ativo !== 'boolean')
  ) {
    return NextResponse.json({ error: 'Procedimento inválido' }, { status: 400 });
  }

  try {
    const data = await prisma.procedimento.create({
      data: {
        hospitalId,
        nome: body.nome.trim(),
        codigo: typeof body.codigo === 'string' ? body.codigo.trim() || null : null,
        descricao: typeof body.descricao === 'string' ? body.descricao : null,
        valorBase: typeof body.valorBase === 'number' ? body.valorBase : null,
        ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
      },
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar procedimento' }, { status: 500 });
  }
}
