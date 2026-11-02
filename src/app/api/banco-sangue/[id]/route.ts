import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';

const quantidadeMaxima = 2_147_483_647;

/** Correção de inventário: define o saldo do tipo sanguíneo, com motivo obrigatório e autor auditado. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('sangue:gerir');
    if (negado) return negado;

    const { id } = await params;
    const body = await lerJson(request);
    const quantidade = body?.quantidade;
    if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 0 || quantidade > quantidadeMaxima) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }
    const motivo = typeof body?.motivo === 'string' ? body.motivo.trim().slice(0, 500) : '';
    if (!motivo) return NextResponse.json({ error: 'Informe o motivo da correção' }, { status: 400 });

    const status = quantidade < 5 ? 'CRÍTICO' : (quantidade < 15 ? 'ALERTA' : 'NORMAL');

    const resultado = await prisma.$transaction(async tx => {
      const registro = await tx.estoqueSangue.findFirst({ where: { id, hospitalId: ator.hospitalId }, select: { tipo: true } });
      if (!registro) return null;
      const doTipo = await tx.estoqueSangue.findMany({
        where: { hospitalId: ator.hospitalId, tipo: registro.tipo },
        select: { id: true, quantidade: true },
      });
      const anterior = doTipo.reduce((soma, item) => soma + item.quantidade, 0);
      await tx.estoqueSangue.updateMany({
        where: { hospitalId: ator.hospitalId, tipo: registro.tipo, id: { not: id } },
        data: { quantidade: 0, status },
      });
      await tx.estoqueSangue.updateMany({ where: { id, hospitalId: ator.hospitalId }, data: { quantidade, status } });
      return { tipo: registro.tipo, anterior };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!resultado) return NextResponse.json({ error: 'Estoque não encontrado' }, { status: 404 });

    await auditar(ator, 'SANGUE_CORRECAO', 'EstoqueSangue', id, { tipo: resultado.tipo, saldoAnterior: resultado.anterior, saldo: quantidade, motivo });
    return NextResponse.json(await prisma.estoqueSangue.findFirst({ where: { id, hospitalId: ator.hospitalId } }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'O estoque foi atualizado simultaneamente. Atualize os dados e tente novamente.' }, { status: 409 });
    }
    console.error('Erro ao atualizar banco de sangue:', error instanceof Error ? error.name : 'erro');
    return NextResponse.json({ error: 'Erro ao atualizar banco de sangue' }, { status: 500 });
  }
}
