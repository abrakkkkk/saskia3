import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { falha, respostaErro, respostaFalha } from '@/lib/faturamento/servidor'

type Ctx = { params: Promise<{ id: string }> }

// GET devolve o lote com as contas; ?download=1 baixa o arquivo (XML TISS em ISO-8859-1, BPA/AIH em texto ASCII).
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const { id } = await params
    const lote = await prisma.loteFaturamento.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      include: {
        operadora: { select: { id: true, nome: true } },
        contas: { select: { id: true, numero: true, status: true, valorTotal: true, valorGlosado: true, valorPago: true, paciente: { select: { nome: true } } }, orderBy: { numero: 'asc' } },
      },
    })
    if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    if (request.nextUrl.searchParams.get('download') === '1') {
      await auditar(ator, 'faturamento.lote.baixar', 'LoteFaturamento', id, { arquivo: lote.arquivoNome })
      const xml = lote.tipo === 'TISS'
      return new NextResponse(Buffer.from(lote.arquivoConteudo, 'latin1'), {
        headers: {
          'Content-Type': xml ? 'application/xml; charset=ISO-8859-1' : 'text/plain; charset=us-ascii',
          'Content-Disposition': `attachment; filename="${lote.arquivoNome}"`,
          'Cache-Control': 'no-store',
        },
      })
    }
    const { arquivoConteudo: _conteudo, ...resto } = lote
    void _conteudo
    return NextResponse.json(resto)
  } catch (error) {
    return respostaErro(error, 'abrir lote')
  }
}

// acao: enviar (registra o envio manual e o protocolo), processar (retorno recebido) ou cancelar (devolve as contas para FECHADA).
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const { id } = await params
    const corpo = await lerJson(request)
    const lote = await prisma.loteFaturamento.findFirst({ where: { id, hospitalId: ator.hospitalId }, select: { id: true, status: true } })
    if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    const protocolo = typeof corpo?.protocolo === 'string' ? corpo.protocolo.trim().slice(0, 30) || null : null

    if (corpo?.acao === 'enviar') {
      if (lote.status !== 'GERADO') return respostaFalha(falha('Só lote gerado pode ser marcado como enviado', 409))
      await prisma.$transaction([
        prisma.loteFaturamento.update({ where: { id }, data: { status: 'ENVIADO', enviadoEm: new Date(), protocolo } }),
        prisma.contaFaturamento.updateMany({ where: { loteId: id, hospitalId: ator.hospitalId, status: 'EM_LOTE' }, data: { status: 'ENVIADA' } }),
      ])
    } else if (corpo?.acao === 'processar') {
      if (lote.status !== 'ENVIADO') return respostaFalha(falha('Só lote enviado pode ser marcado como processado', 409))
      await prisma.loteFaturamento.update({ where: { id }, data: { status: 'PROCESSADO', ...(protocolo ? { protocolo } : {}) } })
    } else if (corpo?.acao === 'cancelar') {
      if (lote.status !== 'GERADO') return respostaFalha(falha('Lote já enviado não pode ser cancelado', 409))
      await prisma.$transaction([
        prisma.contaFaturamento.updateMany({ where: { loteId: id, hospitalId: ator.hospitalId }, data: { status: 'FECHADA', loteId: null } }),
        prisma.loteFaturamento.update({ where: { id }, data: { status: 'CANCELADO' } }),
      ])
    } else {
      return respostaFalha(falha('Ação desconhecida'))
    }
    await auditar(ator, `faturamento.lote.${corpo.acao}`, 'LoteFaturamento', id, { protocolo })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respostaErro(error, 'atualizar lote')
  }
}
