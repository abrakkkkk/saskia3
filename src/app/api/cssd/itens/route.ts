import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';
import { INTEGRIDADES } from '@/lib/cssd';

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('cssd:gerir');
    if (negado) return negado;

    const body = await lerJson(request);
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    if (
      typeof body.loteId !== 'string' || !body.loteId ||
      typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 200 ||
      typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 100 ||
      typeof body.embalagem !== 'string' || !body.embalagem.trim() || body.embalagem.length > 100 ||
      typeof body.integridade !== 'string' || !(INTEGRIDADES as readonly string[]).includes(body.integridade) ||
      (body.quantidade !== undefined && (!Number.isInteger(body.quantidade) || (body.quantidade as number) < 1 || (body.quantidade as number) > 100000))
    ) return NextResponse.json({ error: 'Dados do item inválidos' }, { status: 400 });

    const loteId = body.loteId;
    const nome = body.nome.trim();
    const tipo = body.tipo.trim();
    const embalagem = body.embalagem.trim();
    const integridade = body.integridade;
    const quantidade = typeof body.quantidade === 'number' ? body.quantidade : 1;

    const resultado = await prisma.$transaction(async (tx) => {
      const lote = await tx.cssdLote.findFirst({
        where: { id: loteId, hospitalId: ator.hospitalId },
        select: { id: true, status: true },
      });
      if (!lote) return { error: 'nao_encontrado' as const };
      if (!['Recepção', 'Limpeza', 'Preparo', 'Esterilização'].includes(lote.status)) {
        return { error: 'encerrado' as const };
      }

      return tx.cssdItem.create({
        data: { loteId: lote.id, nome, tipo, quantidade, embalagem, integridade },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in resultado) {
      if (resultado.error === 'nao_encontrado') return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
      return NextResponse.json({ error: 'Não é possível adicionar itens a um lote encerrado' }, { status: 409 });
    }

    await auditar(ator, 'CSSD_ITEM_ADICIONADO', 'CssdLote', loteId, { itemId: resultado.id, nome, quantidade, integridade });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'O status do lote foi alterado. Atualize a tela e tente novamente.' }, { status: 409 });
    }
    console.error('Erro ao registrar item CSSD:', error instanceof Error ? error.name : 'erro');
    return NextResponse.json({ error: 'Erro ao registrar item' }, { status: 500 });
  }
}
