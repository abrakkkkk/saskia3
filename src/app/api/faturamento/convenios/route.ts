import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { lerConvenio, SELECT_CONVENIO } from '@/lib/faturamento/convenio'
import { ehFalha, respostaErro, respostaFalha } from '@/lib/faturamento/servidor'

// Convênios (operadoras de plano de saúde) com registro ANS para as guias TISS.
export async function GET() {
  try {
    const { ator, negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const convenios = await prisma.operadoraPlano.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { nome: 'asc' },
      take: LIMITE_LISTA,
      select: SELECT_CONVENIO,
    })
    return NextResponse.json(convenios)
  } catch (error) {
    return respostaErro(error, 'listar convênios')
  }
}

export async function POST(request: Request) {
  try {
    const { ator, negado } = await exigir('faturamento:configurar')
    if (negado) return negado
    const corpo = await lerJson(request)
    if (!corpo) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const dados = lerConvenio(corpo, true)
    if (ehFalha(dados)) return respostaFalha(dados)
    const convenio = await prisma.operadoraPlano.create({
      data: { ...dados, hospitalId: ator.hospitalId, vigencia: '', teto: '', nome: dados.nome as string, codigoAns: dados.codigoAns as string },
      select: SELECT_CONVENIO,
    })
    await auditar(ator, 'faturamento.convenio.criar', 'OperadoraPlano', convenio.id, { codigoAns: convenio.codigoAns })
    return NextResponse.json(convenio, { status: 201 })
  } catch (error) {
    return respostaErro(error, 'cadastrar convênio')
  }
}
