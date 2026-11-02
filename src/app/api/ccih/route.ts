import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard';
import { isRecord } from '@/lib/request-validation';

const tiposPermitidos = new Set(['IRAS', 'CULTURA', 'HM', 'ATM']);
const statusPermitidos = new Set(['ATIVO', 'TRATADO', 'INATIVO']);

export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('ccih:ler');
    if (negado) return negado;

    const tipo = new URL(request.url).searchParams.get('tipo');
    if (tipo && !tiposPermitidos.has(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });

    const registros = await prisma.ccihRegistro.findMany({
      where: {
        hospitalId: ator.hospitalId,
        status: { not: 'INATIVO' },
        ...(tipo ? { tipo } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    });

    return NextResponse.json(registros);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar registros de CCIH' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('ccih:gerir');
    if (negado) return negado;

    const body = await lerJson(request);
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const data = typeof body.data === 'string' ? new Date(body.data) : new Date();
    if (
      typeof body.tipo !== 'string' || !tiposPermitidos.has(body.tipo) ||
      (body.subtipo !== undefined && body.subtipo !== null && (typeof body.subtipo !== 'string' || body.subtipo.length > 100)) ||
      (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) ||
      (body.dados !== undefined && body.dados !== null && !isRecord(body.dados)) ||
      (body.data !== undefined && (typeof body.data !== 'string' || Number.isNaN(data.getTime()))) ||
      (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status)))
    ) return NextResponse.json({ error: 'Registro de CCIH inválido' }, { status: 400 });

    const dados = isRecord(body.dados) ? { ...body.dados } : undefined;
    // Quem notifica vem da sessão, e o paciente informado precisa ser deste hospital.
    if (dados && body.tipo === 'IRAS') dados.notificadoPor = ator.nome;
    if (dados && dados.pacienteId !== undefined) {
      const paciente = typeof dados.pacienteId === 'string'
        ? await prisma.paciente.findFirst({ where: { id: dados.pacienteId, hospitalId: ator.hospitalId }, select: { id: true, nome: true } })
        : null;
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 });
      dados.paciente = paciente.nome;
    }

    const registro = await prisma.ccihRegistro.create({
      data: {
        hospitalId: ator.hospitalId,
        tipo: body.tipo,
        subtipo: typeof body.subtipo === 'string' ? body.subtipo : null,
        descricao: typeof body.descricao === 'string' ? body.descricao : null,
        dados: dados as Prisma.InputJsonValue | undefined,
        data: body.data ? data : new Date(),
        status: typeof body.status === 'string' ? body.status : 'ATIVO',
        criadoPor: ator.nome,
      },
    });

    await auditar(ator, 'ccih.registrar', 'CcihRegistro', registro.id, { tipo: registro.tipo });
    return NextResponse.json(registro, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar registro de CCIH' }, { status: 500 });
  }
}
