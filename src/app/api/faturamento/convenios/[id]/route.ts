import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { lerConvenio, SELECT_CONVENIO } from '@/lib/faturamento/convenio'
import { ehFalha, respostaErro, respostaFalha } from '@/lib/faturamento/servidor'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('faturamento:configurar')
    if (negado) return negado
    const { id } = await params
    const corpo = await lerJson(request)
    if (!corpo) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const dados = lerConvenio(corpo, false)
    if (ehFalha(dados)) return respostaFalha(dados)
    const r = await prisma.operadoraPlano.updateMany({ where: { id, hospitalId: ator.hospitalId }, data: dados })
    if (!r.count) return NextResponse.json({ error: 'Convênio não encontrado' }, { status: 404 })
    await auditar(ator, 'faturamento.convenio.editar', 'OperadoraPlano', id, { campos: Object.keys(dados) })
    const convenio = await prisma.operadoraPlano.findFirst({ where: { id, hospitalId: ator.hospitalId }, select: SELECT_CONVENIO })
    return NextResponse.json(convenio)
  } catch (error) {
    return respostaErro(error, 'editar convênio')
  }
}
