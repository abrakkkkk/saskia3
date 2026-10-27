import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

const statusPermitidos = new Set(['ATIVO', 'TRATADO', 'INATIVO']);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    if (!isRecord(body) ||
      (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status))) ||
      (body.dados !== undefined && body.dados !== null && !isRecord(body.dados)) ||
      (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) ||
      (body.subtipo !== undefined && body.subtipo !== null && (typeof body.subtipo !== 'string' || body.subtipo.length > 100))
    ) return NextResponse.json({ error: 'Atualização de CCIH inválida' }, { status: 400 });

    const registro = await prisma.ccihRegistro.findFirst({
      where: { id, hospitalId }
    });
    if (!registro) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    // Preservar e mesclar os dados clínicos existentes
    const dadosAntigos = isRecord(registro.dados) ? registro.dados : {};
    const novosDados = isRecord(body.dados) ? body.dados : {};
    const dadosMesclados = { ...dadosAntigos, ...novosDados } as Prisma.InputJsonObject;

    const atualizado = await prisma.ccihRegistro.updateMany({
      where: { id, hospitalId },
      data: {
        status: typeof body.status === 'string' ? body.status : registro.status,
        dados: dadosMesclados,
        descricao: typeof body.descricao === 'string' ? body.descricao : registro.descricao,
        subtipo: typeof body.subtipo === 'string' ? body.subtipo : registro.subtipo
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.ccihRegistro.findFirst({ where: { id, hospitalId } }));
  } catch (error) {
    console.error('Erro ao atualizar registro CCIH:', error);
    return NextResponse.json({ error: 'Erro ao atualizar registro de CCIH' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const registro = await prisma.ccihRegistro.findFirst({
      where: { id, hospitalId }
    });
    if (!registro) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    const removido = await prisma.ccihRegistro.deleteMany({ where: { id, hospitalId } });
    if (removido.count === 0) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover registro CCIH:', error);
    return NextResponse.json({ error: 'Erro ao remover registro de CCIH' }, { status: 500 });
  }
}
