import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';
import { isRecord } from '@/lib/request-validation';

const statusPermitidos = new Set(['ATIVO', 'TRATADO', 'INATIVO']);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('ccih:gerir');
    if (negado) return negado;
    const { id } = await params;
    const { hospitalId } = ator;

    const body = await lerJson(request);
    if (!body ||
      (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status))) ||
      (body.dados !== undefined && body.dados !== null && !isRecord(body.dados)) ||
      (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) ||
      (body.subtipo !== undefined && body.subtipo !== null && (typeof body.subtipo !== 'string' || body.subtipo.length > 100))
    ) return NextResponse.json({ error: 'Atualização de CCIH inválida' }, { status: 400 });

    const registro = await prisma.ccihRegistro.findFirst({ where: { id, hospitalId } });
    if (!registro) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    // Preserva e mescla os dados clínicos existentes.
    const dadosAntigos = isRecord(registro.dados) ? registro.dados : {};
    const novosDados = isRecord(body.dados) ? body.dados : {};
    const dadosMesclados = { ...dadosAntigos, ...novosDados } as Prisma.InputJsonObject;

    const atualizado = await prisma.ccihRegistro.updateMany({
      where: { id, hospitalId },
      data: {
        status: typeof body.status === 'string' ? body.status : registro.status,
        dados: dadosMesclados,
        descricao: typeof body.descricao === 'string' ? body.descricao : registro.descricao,
        subtipo: typeof body.subtipo === 'string' ? body.subtipo : registro.subtipo,
      },
    });
    if (atualizado.count === 0) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    await auditar(ator, 'ccih.atualizar', 'CcihRegistro', id, { de: registro.status, para: typeof body.status === 'string' ? body.status : registro.status });
    return NextResponse.json(await prisma.ccihRegistro.findFirst({ where: { id, hospitalId } }));
  } catch {
    console.error('Erro ao atualizar registro CCIH');
    return NextResponse.json({ error: 'Erro ao atualizar registro de CCIH' }, { status: 500 });
  }
}

// Sem exclusão física: o registro de vigilância fica inativo e mantém o histórico.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('ccih:gerir');
    if (negado) return negado;
    const { id } = await params;

    const inativado = await prisma.ccihRegistro.updateMany({
      where: { id, hospitalId: ator.hospitalId, status: { not: 'INATIVO' } },
      data: { status: 'INATIVO' },
    });
    if (inativado.count === 0) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    await auditar(ator, 'ccih.inativar', 'CcihRegistro', id);
    return NextResponse.json({ success: true });
  } catch {
    console.error('Erro ao inativar registro CCIH');
    return NextResponse.json({ error: 'Erro ao inativar registro de CCIH' }, { status: 500 });
  }
}
