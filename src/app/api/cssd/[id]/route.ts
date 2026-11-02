import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';
import {
  BOWIE_DICK,
  INDICADOR_BIOLOGICO,
  INDICADOR_QUIMICO,
  ITEM_REJEITADO,
  indicadoresConformes,
  indicadoresReprovados,
} from '@/lib/cssd';

const fluxoStatus: Record<string, string> = {
  'Recepção': 'Limpeza',
  Limpeza: 'Preparo',
  Preparo: 'Esterilização',
  Esterilização: 'Pronto',
};

const inclui = (lista: readonly string[], valor: unknown): valor is string => typeof valor === 'string' && lista.includes(valor);

/**
 * Duas operações, com autor na auditoria:
 *  - { status }: avança o lote ou o rejeita;
 *  - { indicadorQuimico, indicadorBiologico, bowieDick }: registra o resultado depois do ciclo.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('cssd:gerir');
    if (negado) return negado;

    const body = await lerJson(request);
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const { id } = await params;
    const lote = await prisma.cssdLote.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: {
        id: true, numero: true, status: true, indicadorQuimico: true, indicadorBiologico: true, bowieDick: true,
        itens: { select: { integridade: true } },
      },
    });
    if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    const registraIndicadores = body.indicadorQuimico !== undefined || body.indicadorBiologico !== undefined || body.bowieDick !== undefined;

    if (registraIndicadores) {
      if (!inclui(INDICADOR_QUIMICO, body.indicadorQuimico) || !inclui(INDICADOR_BIOLOGICO, body.indicadorBiologico) || !inclui(BOWIE_DICK, body.bowieDick)) {
        return NextResponse.json({ error: 'Informe os três indicadores com valores válidos' }, { status: 400 });
      }
      if (lote.status !== 'Esterilização') {
        return NextResponse.json({ error: 'Os indicadores são registrados na etapa de esterilização' }, { status: 409 });
      }
      const indicadores = {
        indicadorQuimico: body.indicadorQuimico,
        indicadorBiologico: body.indicadorBiologico,
        bowieDick: body.bowieDick,
      };
      const reprovado = indicadoresReprovados(indicadores);
      const atualizado = await prisma.cssdLote.updateMany({
        where: { id, hospitalId: ator.hospitalId, status: lote.status },
        data: { ...indicadores, ...(reprovado ? { status: 'Rejeitado' } : {}) },
      });
      if (atualizado.count === 0) {
        return NextResponse.json({ error: 'O lote mudou de status. Atualize a tela e tente novamente.' }, { status: 409 });
      }
      await auditar(ator, 'CSSD_INDICADORES', 'CssdLote', id, { numero: lote.numero, ...indicadores, rejeitadoAutomaticamente: reprovado });
      return NextResponse.json(await prisma.cssdLote.findFirst({ where: { id, hospitalId: ator.hospitalId }, include: { itens: true } }));
    }

    if (typeof body.status !== 'string') {
      return NextResponse.json({ error: 'Status do lote inválido' }, { status: 400 });
    }
    const statusPermitido = body.status === 'Rejeitado'
      ? lote.status !== 'Pronto' && lote.status !== 'Rejeitado'
      : fluxoStatus[lote.status] === body.status;
    if (!statusPermitido) {
      return NextResponse.json({ error: 'Transição de status inválida para este lote' }, { status: 409 });
    }

    if (body.status === 'Pronto') {
      if (indicadoresReprovados(lote)) {
        await prisma.cssdLote.updateMany({ where: { id, hospitalId: ator.hospitalId, status: lote.status }, data: { status: 'Rejeitado' } });
        await auditar(ator, 'CSSD_REJEITADO', 'CssdLote', id, { numero: lote.numero, motivo: 'indicador reprovado' });
        return NextResponse.json({ error: 'Indicador reprovado: o lote foi rejeitado' }, { status: 409 });
      }
      if (!indicadoresConformes(lote)) {
        return NextResponse.json({ error: 'Registre todos os indicadores com resultado conforme antes de liberar o lote' }, { status: 409 });
      }
      if (!lote.itens.some(item => item.integridade !== ITEM_REJEITADO)) {
        return NextResponse.json({ error: 'O lote precisa de ao menos um item íntegro para ser liberado' }, { status: 409 });
      }
    }

    const atualizado = await prisma.cssdLote.updateMany({
      where: { id, hospitalId: ator.hospitalId, status: lote.status },
      data: { status: body.status },
    });
    if (atualizado.count === 0) {
      return NextResponse.json({ error: 'O lote mudou de status. Atualize a tela e tente novamente.' }, { status: 409 });
    }

    await auditar(ator, body.status === 'Rejeitado' ? 'CSSD_REJEITADO' : 'CSSD_STATUS', 'CssdLote', id, { numero: lote.numero, de: lote.status, para: body.status });
    return NextResponse.json(await prisma.cssdLote.findFirst({ where: { id, hospitalId: ator.hospitalId }, include: { itens: true } }));
  } catch (error) {
    console.error('Erro ao atualizar lote CSSD:', error instanceof Error ? error.name : 'erro');
    return NextResponse.json({ error: 'Erro ao atualizar lote CSSD' }, { status: 500 });
  }
}
