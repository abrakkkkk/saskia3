import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

function validatePayload(body: unknown) {
  if (!isRecord(body)) return { error: 'Dados inválidos' };
  if (Object.keys(body).some(key => !['nome', 'codigo', 'descricao', 'valorBase', 'ativo'].includes(key))) return { error: 'Campo não permitido' };
  if (body.nome !== undefined && (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.trim().length > 120)) return { error: 'Nome inválido' };
  if (body.codigo !== undefined && body.codigo !== null && (typeof body.codigo !== 'string' || body.codigo.length > 60)) return { error: 'Código inválido' };
  if (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) return { error: 'Descrição inválida' };
  if (body.valorBase !== undefined && body.valorBase !== null && (typeof body.valorBase !== 'number' || !Number.isFinite(body.valorBase) || body.valorBase < 0 || body.valorBase > 100000000)) return { error: 'Valor inválido' };
  if (body.ativo !== undefined && typeof body.ativo !== 'boolean') return { error: 'Status inválido' };
  if (Object.keys(body).length === 0) return { error: 'Nenhuma alteração informada' };
  return { data: body };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
  const { id } = await params;
  if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const result = validatePayload(body);
  if (result.error || !result.data) return NextResponse.json({ error: result.error }, { status: 400 });

  const data: { nome?: string; codigo?: string | null; descricao?: string | null; valorBase?: number | null; ativo?: boolean } = {};
  const payload = result.data as Record<string, unknown>;
  if (typeof payload.nome === 'string') data.nome = payload.nome.trim();
  if ('codigo' in payload) data.codigo = typeof payload.codigo === 'string' ? payload.codigo.trim() || null : null;
  if ('descricao' in payload) data.descricao = typeof payload.descricao === 'string' ? payload.descricao.trim() || null : null;
  if ('valorBase' in payload) data.valorBase = typeof payload.valorBase === 'number' ? payload.valorBase : null;
  if (typeof payload.ativo === 'boolean') data.ativo = payload.ativo;

  const updated = await prisma.procedimento.updateMany({ where: { id, hospitalId }, data });
  if (updated.count === 0) return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 });
  return NextResponse.json(await prisma.procedimento.findFirst({ where: { id, hospitalId } }));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
  const { id } = await params;
  if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

  const updated = await prisma.procedimento.updateMany({ where: { id, hospitalId, ativo: true }, data: { ativo: false } });
  if (updated.count === 0) return NextResponse.json({ error: 'Procedimento ativo não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
