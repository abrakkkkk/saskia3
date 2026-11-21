import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { ETAPAS_CHECKLIST, MODELO_CHECKLIST, etapaAnterior, validarEtapa, type EtapaChecklist } from '@/lib/checklist-cirurgico'
import { situacaoModelo } from '@/lib/modelos-clinicos-servidor'

type Params = { params: Promise<{ id: string }> }

const SELECAO_ETAPA = {
  etapa: true, respostas: true, observacoes: true, modelo: true,
  respondidoPorNome: true, respondidoPorCargo: true, respondidoEm: true,
} as const

// Item 10: Lista de Verificação de Segurança Cirúrgica (MS/Anvisa). Uma etapa por vez, na ordem, sem edição.
export async function GET(_request: NextRequest, { params }: Params) {
  const { ator, negado } = await exigir('cirurgia:ler')
  if (negado) return negado
  const { id } = await params
  if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
  try {
    const cirurgia = await prisma.cirurgia.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: { id: true, status: true, checklistEtapas: { select: SELECAO_ETAPA } },
    })
    if (!cirurgia) return NextResponse.json({ error: 'Cirurgia não encontrada' }, { status: 404 })
    return NextResponse.json({
      cirurgiaId: cirurgia.id,
      status: cirurgia.status,
      modelo: await situacaoModelo(ator.hospitalId, 'CHECKLIST_CIRURGICO'),
      etapas: cirurgia.checklistEtapas,
    })
  } catch {
    console.error('Erro ao ler checklist cirúrgico')
    return NextResponse.json({ error: 'Erro ao carregar o checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { ator, negado } = await exigir('cirurgia:checklist')
  if (negado) return negado
  const { id } = await params
  if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
  const body = await lerJson(request)
  if (!body || typeof body.etapa !== 'string' || !ETAPAS_CHECKLIST.includes(body.etapa as EtapaChecklist)) {
    return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 })
  }
  const etapa = body.etapa as EtapaChecklist
  const observacoes = typeof body.observacoes === 'string' && body.observacoes.trim() ? body.observacoes.trim().slice(0, 2000) : null
  try {
    const cirurgia = await prisma.cirurgia.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: { id: true, status: true, checklistEtapas: { select: { etapa: true } } },
    })
    if (!cirurgia) return NextResponse.json({ error: 'Cirurgia não encontrada' }, { status: 404 })
    if (cirurgia.status === 'CANCELADA') return NextResponse.json({ error: 'Cirurgia cancelada: checklist encerrado' }, { status: 409 })
    const feitas = new Set<string>(cirurgia.checklistEtapas.map(e => e.etapa))
    if (feitas.has(etapa)) return NextResponse.json({ error: 'Esta etapa já foi registrada' }, { status: 409 })
    const anterior = etapaAnterior(etapa)
    if (anterior && !feitas.has(anterior)) return NextResponse.json({ error: 'Registre a etapa anterior primeiro' }, { status: 409 })
    // Validado só depois de achar a cirurgia no hospital da sessão: cirurgia de outro hospital sempre dá 404.
    const validacao = validarEtapa(etapa, body.respostas, observacoes)
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 422 })

    const registro = await prisma.checklistCirurgicoEtapa.create({
      data: {
        hospitalId: ator.hospitalId, cirurgiaId: cirurgia.id, etapa, respostas: validacao.respostas, observacoes,
        modelo: MODELO_CHECKLIST, respondidoPorId: ator.id, respondidoPorNome: ator.nome, respondidoPorCargo: ator.cargo,
      },
      select: SELECAO_ETAPA,
    })
    await auditar(ator, 'cirurgia.checklist_etapa', 'Cirurgia', cirurgia.id, { etapa })
    return NextResponse.json(registro, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Esta etapa já foi registrada' }, { status: 409 })
    }
    console.error('Erro ao registrar etapa do checklist cirúrgico')
    return NextResponse.json({ error: 'Erro ao registrar a etapa' }, { status: 500 })
  }
}
