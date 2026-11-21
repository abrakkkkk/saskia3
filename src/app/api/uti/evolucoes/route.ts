import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { MODELO_EVOLUCAO_UTI, validarEvolucaoUti } from '@/lib/evolucao-uti'
import { situacaoModelo } from '@/lib/modelos-clinicos-servidor'

// Item 10: evolução diária de UTI (RDC Anvisa 7/2010), ligada à internação aberta em leito de UTI.
// GET sem parâmetro: internações abertas na UTI com a última evolução. GET ?internacaoId=: histórico.
export async function GET(request: NextRequest) {
  const { ator, negado } = await exigir('uti:ler')
  if (negado) return negado
  const internacaoId = request.nextUrl.searchParams.get('internacaoId')
  try {
    const modelo = await situacaoModelo(ator.hospitalId, 'EVOLUCAO_UTI')
    if (internacaoId) {
      if (internacaoId.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
      const internacao = await prisma.internacao.findFirst({ where: { id: internacaoId, hospitalId: ator.hospitalId }, select: { id: true } })
      if (!internacao) return NextResponse.json({ error: 'Internação não encontrada' }, { status: 404 })
      const evolucoes = await prisma.evolucaoUti.findMany({
        where: { hospitalId: ator.hospitalId, internacaoId },
        orderBy: { registradoEm: 'desc' },
        take: LIMITE_LISTA,
      })
      return NextResponse.json({ modelo, evolucoes })
    }

    const internacoes = await prisma.internacao.findMany({
      where: { hospitalId: ator.hospitalId, saidaEm: null, utiLeitoId: { not: null } },
      orderBy: { entradaEm: 'asc' },
      take: LIMITE_LISTA,
      select: {
        id: true, entradaEm: true, pacienteId: true,
        paciente: { select: { nome: true } },
        utiLeito: { select: { numero: true } },
        evolucoesUti: { orderBy: { registradoEm: 'desc' }, take: 1, select: { registradoEm: true, autorNome: true, dispositivos: true } },
      },
    })
    return NextResponse.json({
      modelo,
      internacoes: internacoes.map(i => ({
        id: i.id, entradaEm: i.entradaEm, pacienteId: i.pacienteId, pacienteNome: i.paciente.nome,
        leito: i.utiLeito?.numero ?? null, ultima: i.evolucoesUti[0] ?? null,
      })),
    })
  } catch {
    console.error('Erro ao ler evoluções de UTI')
    return NextResponse.json({ error: 'Erro ao carregar as evoluções' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { ator, negado } = await exigir('uti:evoluir')
  if (negado) return negado
  const body = await lerJson(request)
  if (!body || typeof body.internacaoId !== 'string' || !body.internacaoId || body.internacaoId.length > 64) {
    return NextResponse.json({ error: 'Informe a internação' }, { status: 400 })
  }
  const validacao = validarEvolucaoUti(body)
  if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 422 })
  try {
    const internacao = await prisma.internacao.findFirst({
      where: { id: body.internacaoId, hospitalId: ator.hospitalId },
      select: { id: true, pacienteId: true, saidaEm: true, utiLeitoId: true },
    })
    if (!internacao) return NextResponse.json({ error: 'Internação não encontrada' }, { status: 404 })
    if (internacao.saidaEm || !internacao.utiLeitoId) {
      return NextResponse.json({ error: 'O paciente não está internado na UTI' }, { status: 409 })
    }
    const { dispositivos, bradenItens, ...resto } = validacao.dados
    const evolucao = await prisma.evolucaoUti.create({
      data: {
        ...resto,
        dispositivos: dispositivos.length ? dispositivos : undefined,
        bradenItens: bradenItens ?? undefined,
        hospitalId: ator.hospitalId, internacaoId: internacao.id, pacienteId: internacao.pacienteId,
        utiLeitoId: internacao.utiLeitoId, autorId: ator.id, autorNome: ator.nome, autorCargo: ator.cargo,
        modelo: MODELO_EVOLUCAO_UTI,
      },
    })
    await auditar(ator, 'uti.evolucao_registrar', 'Internacao', internacao.id, { evolucaoId: evolucao.id })
    return NextResponse.json(evolucao, { status: 201 })
  } catch {
    console.error('Erro ao registrar evolução de UTI')
    return NextResponse.json({ error: 'Erro ao registrar a evolução' }, { status: 500 })
  }
}
