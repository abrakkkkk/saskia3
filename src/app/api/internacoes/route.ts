import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'
import { ehFalha, internar, SELECT_INTERNACAO, validarEntrada } from '@/lib/internacao'
import { respostaErro, respostaFalha, SERIALIZAVEL } from '@/lib/internacao-api'

// GET ?pacienteId=... devolve o histórico do paciente; sem parâmetro, as internações abertas do hospital.
export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('internacao:ler')
    if (negado) return negado
    const pacienteId = request.nextUrl.searchParams.get('pacienteId')
    if (pacienteId) {
      const paciente = await prisma.paciente.findFirst({ where: { id: pacienteId, hospitalId: ator.hospitalId }, select: { id: true } })
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      const internacoes = await prisma.internacao.findMany({
        where: { hospitalId: ator.hospitalId, pacienteId },
        orderBy: { entradaEm: 'desc' },
        take: LIMITE_LISTA,
        select: SELECT_INTERNACAO,
      })
      return NextResponse.json(internacoes)
    }
    const abertas = await prisma.internacao.findMany({
      where: { hospitalId: ator.hospitalId, saidaEm: null },
      orderBy: { entradaEm: 'asc' },
      take: LIMITE_LISTA,
      select: { ...SELECT_INTERNACAO, movimentacoes: false, paciente: { select: { id: true, nome: true } } },
    })
    return NextResponse.json(abertas)
  } catch (error) {
    return respostaErro(error, 'listar internações')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('internacao:gerir')
    if (negado) return negado
    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const pacienteId = typeof input.pacienteId === 'string' ? input.pacienteId.trim() : ''
    if (!pacienteId) return NextResponse.json({ error: 'Informe o paciente' }, { status: 400 })

    const dados = validarEntrada(input)
    if (ehFalha(dados)) return respostaFalha(dados)
    if (dados.utiLeitoId && !pode(ator.cargo, 'uti:gerir')) {
      return NextResponse.json({ error: 'Somente médico ou enfermeiro interna em leito de UTI' }, { status: 403 })
    }

    const resultado = await prisma.$transaction(tx => internar(tx, ator, pacienteId, dados), SERIALIZAVEL)
    if (ehFalha(resultado)) return respostaFalha(resultado)

    await auditar(ator, 'internacao.internar', 'Internacao', resultado.internacaoId, {
      pacienteId, setor: dados.setor, leito: dados.leito, utiLeitoId: dados.utiLeitoId,
      status: { de: resultado.statusAnterior, para: resultado.status },
    })
    const internacao = await prisma.internacao.findFirst({ where: { id: resultado.internacaoId, hospitalId: ator.hospitalId }, select: SELECT_INTERNACAO })
    return NextResponse.json(internacao, { status: 201 })
  } catch (error) {
    return respostaErro(error, 'internar o paciente')
  }
}
