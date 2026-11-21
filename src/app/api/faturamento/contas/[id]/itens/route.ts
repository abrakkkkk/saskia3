import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { CODIGO_DESPESA, codigoValido } from '@/lib/faturamento/dominios'
import { SERIALIZAVEL, data, ehFalha, falha, recalcularConta, respostaErro, respostaFalha, texto } from '@/lib/faturamento/servidor'

const TABELAS_TISS = new Set(['22', '18', '19', '20', '00'])

// Lança um item na conta. Código das tabelas oficiais é conferido no catálogo; o valor sugerido vem do
// preço do convênio (TISS) ou do valor SIGTAP (SH + SP para AIH; SA para ambulatório).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const { id } = await params
    const corpo = await lerJson(request)
    if (!corpo) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const conta = await prisma.contaFaturamento.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: { id: true, status: true, fonte: true, tipoGuia: true, operadoraId: true, dataAtendimento: true },
    })
    if (!conta) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    if (conta.status !== 'ABERTA') return respostaFalha(falha('Conta fechada: reabra para lançar itens', 409))

    const tabela = typeof corpo.tabela === 'string' ? corpo.tabela : ''
    if (conta.fonte === 'SUS' ? tabela !== 'SIGTAP' : !TABELAS_TISS.has(tabela)) {
      return respostaFalha(falha(conta.fonte === 'SUS' ? 'No SUS, lance procedimentos da SIGTAP' : 'Tabela não aceita em guia TISS'))
    }
    const codigo = texto(corpo, 'codigo', 10, tabela === 'SIGTAP' ? /^\d{10}$/ : /^[\w.-]{1,10}$/)
    const descricaoInformada = texto(corpo, 'descricao', 150)
    const dataExecucao = data(corpo, 'dataExecucao')
    const cbo = texto(corpo, 'cbo', 6, /^\d{6}$/)
    const unidadeMedida = texto(corpo, 'unidadeMedida', 3, /^\d{3}$/)
    for (const v of [codigo, descricaoInformada, dataExecucao, cbo, unidadeMedida]) if (ehFalha(v)) return respostaFalha(v)
    if (!codigo) return respostaFalha(falha('Informe o código do item'))
    const quantidade = typeof corpo.quantidade === 'number' && corpo.quantidade > 0 && corpo.quantidade <= 9999 ? corpo.quantidade : null
    if (quantidade === null) return respostaFalha(falha('Quantidade inválida'))
    const codigoDespesa = corpo.codigoDespesa === null || corpo.codigoDespesa === undefined || corpo.codigoDespesa === '' ? null : corpo.codigoDespesa
    if (codigoDespesa !== null && !codigoValido(CODIGO_DESPESA, codigoDespesa)) return respostaFalha(falha('Código de despesa fora da tabela 25'))
    if (conta.fonte === 'SUS' && codigoDespesa) return respostaFalha(falha('Despesas avulsas não se aplicam ao SUS'))
    if (conta.tipoGuia === 'CONSULTA' && codigoDespesa) return respostaFalha(falha('Guia de consulta só leva o procedimento da consulta'))

    let descricao = descricaoInformada as string | null
    let sugerido: number | null = null
    if (tabela !== '00') {
      const ref = await prisma.procedimentoTabela.findUnique({ where: { tabela_codigo: { tabela, codigo: codigo as string } } })
      if (!ref || !ref.ativo) return respostaFalha(falha(`Código ${codigo} não está vigente na tabela ${tabela === 'SIGTAP' ? 'SIGTAP' : `TUSS ${tabela}`}`))
      descricao = ref.descricao.slice(0, 150)
      if (tabela === 'SIGTAP') {
        sugerido = conta.tipoGuia === 'AIH' ? Number(ref.valorSh ?? 0) + Number(ref.valorSp ?? 0) : Number(ref.valorSa ?? 0)
      }
    }
    if (!descricao) return respostaFalha(falha('Informe a descrição do item da tabela própria'))
    if (conta.operadoraId && tabela !== 'SIGTAP') {
      const preco = await prisma.precoConvenio.findUnique({ where: { operadoraId_tabela_codigo: { operadoraId: conta.operadoraId, tabela, codigo: codigo as string } } })
      if (preco) sugerido = Number(preco.valor)
    }
    const informado = typeof corpo.valorUnitario === 'number' && Number.isFinite(corpo.valorUnitario) && corpo.valorUnitario >= 0 ? corpo.valorUnitario : null
    const valorUnitario = informado ?? sugerido
    if (valorUnitario === null) return respostaFalha(falha('Informe o valor unitário (não há preço cadastrado para este convênio)'))
    if (valorUnitario > 99_999_999) return respostaFalha(falha('Valor alto demais'))

    const item = await prisma.$transaction(async tx => {
      const criado = await tx.itemConta.create({
        data: {
          hospitalId: ator.hospitalId, contaId: id, tabela, codigo: codigo as string, descricao,
          quantidade: new Prisma.Decimal(quantidade.toFixed(4)),
          valorUnitario: new Prisma.Decimal(valorUnitario.toFixed(2)),
          valorTotal: new Prisma.Decimal((Math.round(valorUnitario * quantidade * 100) / 100).toFixed(2)),
          dataExecucao: (dataExecucao as Date | null | undefined) ?? conta.dataAtendimento,
          codigoDespesa, unidadeMedida: (unidadeMedida as string | null | undefined) ?? (codigoDespesa ? '036' : null), cbo: (cbo as string | null | undefined) ?? null,
        },
      })
      await recalcularConta(tx, id)
      return criado
    }, SERIALIZAVEL)
    await auditar(ator, 'faturamento.item.lancar', 'ItemConta', item.id, { contaId: id, tabela, codigo })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return respostaErro(error, 'lançar item')
  }
}
