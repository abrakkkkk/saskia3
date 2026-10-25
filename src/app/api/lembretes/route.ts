import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TIPOS = new Set(['consulta', 'medicacao', 'exame', 'cirurgia', 'pessoal']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dataHoraFrom(body: Record<string, unknown>) {
  const value = body.dataHora ?? body.data;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { id: usuarioId, hospitalId, cargo } = session.user;
    if (!usuarioId || !hospitalId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });

    const lembretes = await prisma.lembrete.findMany({
      where: cargo === 'ADMIN' ? { hospitalId } : { hospitalId, criadoPorId: usuarioId },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(lembretes);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar lembretes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { id: usuarioId, hospitalId, name } = session.user;
    if (!usuarioId || !hospitalId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const dataHora = dataHoraFrom(body);
    const tipo = typeof body.tipo === 'string' ? body.tipo : 'consulta';
    const descricao = body.descricao === undefined || body.descricao === null || body.descricao === '' ? null : body.descricao;
    const relacionado = body.relacionado === undefined || body.relacionado === null || body.relacionado === '' ? null : body.relacionado;

    if (!titulo || titulo.length > 200 || !dataHora || !TIPOS.has(tipo)) {
      return NextResponse.json({ error: 'Título, data e tipo válidos são obrigatórios' }, { status: 400 });
    }
    if (descricao !== null && (typeof descricao !== 'string' || descricao.length > 4000)) {
      return NextResponse.json({ error: 'Descrição inválida' }, { status: 400 });
    }
    if (relacionado !== null && (typeof relacionado !== 'string' || relacionado.length > 200)) {
      return NextResponse.json({ error: 'Campo relacionado inválido' }, { status: 400 });
    }

    const lembrete = await prisma.lembrete.create({
      data: {
        hospitalId,
        criadoPorId: usuarioId,
        titulo,
        descricao,
        dataHora,
        tipo,
        relacionado,
        criadoPor: name || 'Usuário',
        concluido: false,
        status: 'Pendente'
      }
    });

    return NextResponse.json(lembrete, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar lembrete' }, { status: 500 });
  }
}
