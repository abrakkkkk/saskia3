import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';
import { Prisma } from '@prisma/client';

const tiposPermitidos = new Set(['IRAS', 'CULTURA', 'HM', 'ATM']);
const statusPermitidos = new Set(['ATIVO', 'TRATADO', 'INATIVO']);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    if (tipo && !tiposPermitidos.has(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });

    const registros = await prisma.ccihRegistro.findMany({
      where: {
        hospitalId,
        ...(tipo ? { tipo } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(registros);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar registros de CCIH' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const data = isRecord(body) && typeof body.data === 'string' ? new Date(body.data) : new Date();
    if (
      !isRecord(body) || typeof body.tipo !== 'string' || !tiposPermitidos.has(body.tipo) ||
      (body.subtipo !== undefined && body.subtipo !== null && (typeof body.subtipo !== 'string' || body.subtipo.length > 100)) ||
      (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) ||
      (body.dados !== undefined && body.dados !== null && !isRecord(body.dados)) ||
      (body.data !== undefined && (typeof body.data !== 'string' || Number.isNaN(data.getTime()))) ||
      (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status)))
    ) return NextResponse.json({ error: 'Registro de CCIH inválido' }, { status: 400 });

    const registro = await prisma.ccihRegistro.create({
      data: {
        hospitalId,
        tipo: body.tipo,
        subtipo: typeof body.subtipo === 'string' ? body.subtipo : null,
        descricao: typeof body.descricao === 'string' ? body.descricao : null,
        dados: isRecord(body.dados) ? body.dados as Prisma.InputJsonValue : undefined,
        data: body.data ? data : new Date(),
        status: typeof body.status === 'string' ? body.status : 'ATIVO',
        criadoPor: session.user.name || session.user.email || null
      }
    });

    return NextResponse.json(registro, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar registro de CCIH' }, { status: 500 });
  }
}
