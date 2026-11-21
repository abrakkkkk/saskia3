import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { competenciaValida } from '@/lib/faturamento/dominios'
import {
  INCLUDE_CONTA_ARQUIVO, ehFalha, falha, lerCamposConta, pendenciasSus, pendenciasTiss, respostaErro, respostaFalha,
} from '@/lib/faturamento/servidor'

type Ctx = { params: Promise<{ id: string }> }

async function carregar(id: string, hospitalId: string) {
  return prisma.contaFaturamento.findFirst({
    where: { id, hospitalId },
    include: {
      ...INCLUDE_CONTA_ARQUIVO,
      operadora: { select: { id: true, nome: true, codigoAns: true } },
      internacao: { select: { id: true, entradaEm: true, saidaEm: true, setor: true, leito: true, tipoSaida: true } },
      lote: { select: { id: true, tipo: true, numero: true, status: true } },
    },
  })
}

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const { id } = await params
    const conta = await carregar(id, ator.hospitalId)
    if (!conta) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    const pendencias = conta.fonte === 'SUS' ? pendenciasSus(conta) : pendenciasTiss(conta)
    return NextResponse.json({ ...conta, pendencias })
  } catch (error) {
    return respostaErro(error, 'abrir conta')
  }
}

// Edita o cabeçalho da conta (só enquanto ABERTA).
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const { id } = await params
    const corpo = await lerJson(request)
    if (!corpo) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const campos = lerCamposConta(corpo)
    if (ehFalha(campos)) return respostaFalha(campos)
    if (corpo.competencia !== undefined) {
      if (!competenciaValida(corpo.competencia)) return respostaFalha(falha('Competência inválida (AAAAMM)'))
      campos.competencia = corpo.competencia
    }
    const r = await prisma.contaFaturamento.updateMany({ where: { id, hospitalId: ator.hospitalId, status: 'ABERTA' }, data: campos })
    if (!r.count) return respostaFalha(falha('Conta não encontrada ou já fechada (reabra para editar)', 409))
    await auditar(ator, 'faturamento.conta.editar', 'ContaFaturamento', id, { campos: Object.keys(campos) })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respostaErro(error, 'salvar conta')
  }
}

// Ações de status: fechar, reabrir, cancelar e retorno (pagamento/glosa informados pela operadora ou pelo gestor do SUS).
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const { id } = await params
    const corpo = await lerJson(request)
    const acao = corpo?.acao
    const conta = await carregar(id, ator.hospitalId)
    if (!conta) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

    let de: string[]
    let data: Prisma.ContaFaturamentoUpdateManyMutationInput
    if (acao === 'fechar') {
      const pendencias = conta.fonte === 'SUS' ? pendenciasSus(conta) : pendenciasTiss(conta)
      if (pendencias.length) return respostaFalha(falha(`Falta: ${pendencias.join(', ')}.`, 422))
      de = ['ABERTA']
      data = { status: 'FECHADA', fechadoEm: new Date() }
    } else if (acao === 'reabrir') {
      de = ['FECHADA']
      data = { status: 'ABERTA', fechadoEm: null }
    } else if (acao === 'cancelar') {
      de = ['ABERTA', 'FECHADA']
      data = { status: 'CANCELADA' }
    } else if (acao === 'retorno') {
      const pago = typeof corpo?.valorPago === 'number' && Number.isFinite(corpo.valorPago) && corpo.valorPago >= 0 ? corpo.valorPago : null
      if (pago === null) return respostaFalha(falha('Informe o valor pago (0 se tudo foi glosado)'))
      de = ['EM_LOTE', 'ENVIADA', 'PAGA', 'GLOSADA']
      const glosado = Number(conta.valorGlosado)
      data = { valorPago: new Prisma.Decimal(pago.toFixed(2)), status: glosado > 0 || pago < Number(conta.valorTotal) ? 'GLOSADA' : 'PAGA' }
    } else {
      return respostaFalha(falha('Ação desconhecida'))
    }
    const r = await prisma.contaFaturamento.updateMany({ where: { id, hospitalId: ator.hospitalId, status: { in: de } }, data })
    if (!r.count) return respostaFalha(falha(`Não dá para ${acao} uma conta com status ${conta.status.toLowerCase()}`, 409))
    await auditar(ator, `faturamento.conta.${acao}`, 'ContaFaturamento', id, { de: conta.status, para: data.status as string })
    return NextResponse.json({ ok: true, status: data.status })
  } catch (error) {
    return respostaErro(error, 'atualizar conta')
  }
}
