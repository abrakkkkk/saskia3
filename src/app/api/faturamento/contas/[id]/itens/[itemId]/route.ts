import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { SERIALIZAVEL, falha, recalcularConta, respostaErro, respostaFalha } from '@/lib/faturamento/servidor'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

async function itemDaConta(id: string, itemId: string, hospitalId: string) {
  return prisma.itemConta.findFirst({
    where: { id: itemId, contaId: id, hospitalId },
    select: { id: true, valorTotal: true, conta: { select: { status: true } } },
  })
}

// Remove item (só com a conta ABERTA).
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const { id, itemId } = await params
    const item = await itemDaConta(id, itemId, ator.hospitalId)
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    if (item.conta.status !== 'ABERTA') return respostaFalha(falha('Conta fechada: reabra para remover itens', 409))
    await prisma.$transaction(async tx => {
      await tx.itemConta.delete({ where: { id: itemId } })
      await recalcularConta(tx, id)
    }, SERIALIZAVEL)
    await auditar(ator, 'faturamento.item.remover', 'ItemConta', itemId, { contaId: id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respostaErro(error, 'remover item')
  }
}

// Registra glosa do item (retorno da operadora): valor glosado e código da TUSS tabela 38.
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const { id, itemId } = await params
    const corpo = await lerJson(request)
    const item = await itemDaConta(id, itemId, ator.hospitalId)
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    if (!['EM_LOTE', 'ENVIADA', 'PAGA', 'GLOSADA'].includes(item.conta.status)) return respostaFalha(falha('Glosa só depois que a conta foi para lote', 409))
    const valor = typeof corpo?.valorGlosado === 'number' && Number.isFinite(corpo.valorGlosado) ? corpo.valorGlosado : null
    if (valor === null || valor < 0 || valor > Number(item.valorTotal)) return respostaFalha(falha('Valor glosado deve ficar entre zero e o valor do item'))
    const motivo = typeof corpo?.motivoGlosa === 'string' && /^\d{4}$/.test(corpo.motivoGlosa) ? corpo.motivoGlosa : null
    if (valor > 0 && !motivo) return respostaFalha(falha('Informe o código da glosa (TUSS tabela 38)'))
    if (motivo) {
      const ref = await prisma.procedimentoTabela.findUnique({ where: { tabela_codigo: { tabela: '38', codigo: motivo } }, select: { id: true } })
      if (!ref) return respostaFalha(falha('Código de glosa não encontrado na TUSS tabela 38'))
    }
    await prisma.$transaction(async tx => {
      await tx.itemConta.update({ where: { id: itemId }, data: { valorGlosado: new Prisma.Decimal(valor.toFixed(2)), motivoGlosa: valor > 0 ? motivo : null } })
      await recalcularConta(tx, id)
    }, SERIALIZAVEL)
    await auditar(ator, 'faturamento.item.glosa', 'ItemConta', itemId, { contaId: id, valor, motivo })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respostaErro(error, 'registrar glosa')
  }
}
