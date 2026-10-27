import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

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
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    if (
      typeof body.loteId !== 'string' || !body.loteId ||
      typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 200 ||
      typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 100 ||
      typeof body.embalagem !== 'string' || !body.embalagem.trim() || body.embalagem.length > 100 ||
      typeof body.integridade !== 'string' || !body.integridade.trim() || body.integridade.length > 100 ||
      (body.quantidade !== undefined && (!Number.isInteger(body.quantidade) || (body.quantidade as number) < 1 || (body.quantidade as number) > 100000))
    ) return NextResponse.json({ error: 'Dados do item inválidos' }, { status: 400 });

    const loteId = body.loteId;
    const nome = body.nome.trim();
    const tipo = body.tipo.trim();
    const embalagem = body.embalagem.trim();
    const integridade = body.integridade.trim();
    const quantidade = typeof body.quantidade === 'number' ? body.quantidade : 1;

    const resultado = await prisma.$transaction(async (tx) => {
      const lote = await tx.cssdLote.findFirst({
        where: { id: loteId, hospitalId },
        select: { id: true, status: true },
      });
      if (!lote) return { error: 'nao_encontrado' as const };
      if (!['Recepção', 'Limpeza', 'Preparo', 'Esterilização'].includes(lote.status)) {
        return { error: 'encerrado' as const };
      }

      return tx.cssdItem.create({
        data: {
          loteId: lote.id,
          nome,
          tipo,
          quantidade,
          embalagem,
          integridade
        }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in resultado) {
      if (resultado.error === 'nao_encontrado') return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
      return NextResponse.json({ error: 'Não é possível adicionar itens a um lote encerrado' }, { status: 409 });
    }

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'O status do lote foi alterado. Atualize a tela e tente novamente.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao registrar item' }, { status: 500 });
  }
}
