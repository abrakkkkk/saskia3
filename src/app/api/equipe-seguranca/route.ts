import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function GET() {
  const { ator, negado } = await exigir('seguranca:gerir')
  if (negado) return negado

  try {
    const ocorrencias = await prisma.ocorrenciaSeguranca.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { dataHora: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(ocorrencias)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar registros de segurança' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('seguranca:gerir')
  if (negado) return negado

  const body = await lerJson(request)
  const tipo = typeof body?.tipo === 'string' ? body.tipo.trim() : ''
  const local = typeof body?.local === 'string' ? body.local.trim() : ''
  const relato = typeof body?.relato === 'string' ? body.relato.trim() : ''
  if (!tipo || tipo.length > 100 || !local || local.length > 160 || !relato || relato.length > 4000) {
    return NextResponse.json({ error: 'Informe tipo, local e relato válidos' }, { status: 400 })
  }

  try {
    const ocorrencia = await prisma.ocorrenciaSeguranca.create({
      data: { hospitalId: ator.hospitalId, tipo, local, relato, vigilante: ator.nome },
    })
    await auditar(ator, 'CRIAR', 'OcorrenciaSeguranca', ocorrencia.id, { tipo })
    return NextResponse.json(ocorrencia, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar ocorrência' }, { status: 500 })
  }
}
