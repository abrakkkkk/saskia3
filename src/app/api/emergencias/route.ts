import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const SEM_CACHE = { 'Cache-Control': 'no-store' }
const TIPOS = new Set(['PANICO', 'PCR'])
// Alerta esquecido aberto some do painel depois desse prazo, mas continua gravado.
const VALIDADE_MS = 3 * 60 * 60 * 1000
const JANELA_DUPLICIDADE_MS = 60 * 1000
const CAMPOS = { id: true, tipo: true, local: true, profissional: true, status: true, createdAt: true } as const

/** Alertas ativos do hospital. Qualquer profissional logado vê, inclusive a TV. */
export async function GET() {
  const { ator, negado } = await exigir('emergencia:ler')
  if (negado) return negado
  try {
    const ativas = await prisma.emergencia.findMany({
      where: { hospitalId: ator.hospitalId, status: 'ATIVA', createdAt: { gte: new Date(Date.now() - VALIDADE_MS) } },
      select: CAMPOS,
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return NextResponse.json(ativas, { headers: SEM_CACHE })
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar os alertas.' }, { status: 500, headers: SEM_CACHE })
  }
}

/** Aciona pânico ou PCR. Mesmo tipo e local em 60 s devolve o alerta que já existe (clique duplo, vários colegas). */
export async function POST(request: NextRequest) {
  const { ator, negado } = await exigir('emergencia:acionar')
  if (negado) return negado

  const body = await lerJson(request)
  const tipo = typeof body?.tipo === 'string' ? body.tipo : ''
  const local = typeof body?.local === 'string' ? body.local.trim() : ''
  if (!TIPOS.has(tipo) || !local || local.length > 120) {
    return NextResponse.json({ error: 'Informe o tipo do alerta e o local (até 120 caracteres).' }, { status: 400, headers: SEM_CACHE })
  }

  try {
    const repetida = await prisma.emergencia.findFirst({
      where: { hospitalId: ator.hospitalId, tipo, local, status: 'ATIVA', createdAt: { gte: new Date(Date.now() - JANELA_DUPLICIDADE_MS) } },
      select: CAMPOS,
      orderBy: { createdAt: 'desc' },
    })
    if (repetida) return NextResponse.json(repetida, { status: 200, headers: SEM_CACHE })

    const alerta = await prisma.emergencia.create({
      data: { hospitalId: ator.hospitalId, tipo, local, profissional: ator.nome, usuarioId: ator.id, status: 'ATIVA' },
      select: CAMPOS,
    })
    await auditar(ator, 'EMERGENCIA_ACIONADA', 'Emergencia', alerta.id, { tipo, local })
    return NextResponse.json(alerta, { status: 201, headers: SEM_CACHE })
  } catch (error) {
    console.error('Erro ao acionar emergência:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Não foi possível acionar o alerta. Avise a equipe por outro meio.' }, { status: 500, headers: SEM_CACHE })
  }
}
