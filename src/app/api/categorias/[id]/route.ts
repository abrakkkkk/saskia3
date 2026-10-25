import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    (!('nome' in body) && !('tipo' in body) && !('descricao' in body)) ||
    (body.nome !== undefined && (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 100)) ||
    (body.tipo !== undefined && (typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 60)) ||
    (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 1000))
  ) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
  }

  const data = {
    ...(typeof body.nome === 'string' ? { nome: body.nome.trim() } : {}),
    ...(typeof body.tipo === 'string' ? { tipo: body.tipo.trim() } : {}),
    ...(typeof body.descricao === 'string' || body.descricao === null ? { descricao: body.descricao } : {}),
  };

  try {
    const updated = await prisma.categoria.updateMany({ where: { id, hospitalId }, data });
    if (updated.count === 0) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    const categoria = await prisma.categoria.findFirst({ where: { id, hospitalId } });
    return NextResponse.json(categoria);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

  const { id } = await params;
  try {
    const deleted = await prisma.categoria.deleteMany({ where: { id, hospitalId } });
    if (deleted.count === 0) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
