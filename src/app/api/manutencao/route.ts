import { NextResponse } from 'next/server'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function GET() {
  const { ator, negado } = await exigir('operacao:ler')
  if (negado) return negado

  try {
    const ordens = await prisma.manutencaoOS.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(ordens)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar ordens de manutenção' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('operacao:abrir')
  if (negado) return negado

  const body = await lerJson(request)
  if (
    !body
    || typeof body.equipamento !== 'string' || !body.equipamento.trim() || body.equipamento.length > 200
    || typeof body.setor !== 'string' || !body.setor.trim() || body.setor.length > 100
    || typeof body.tipo !== 'string' || !['Preventiva', 'Corretiva', 'Preditiva', 'Calibração', 'Emergencial'].includes(body.tipo)
    || typeof body.prioridade !== 'string' || !['Normal', 'Urgente', 'Emergência'].includes(body.prioridade)
    || (body.data !== undefined && (typeof body.data !== 'string' || !isValidDate(body.data)))
    || (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000))
  ) {
    return NextResponse.json({ error: 'Dados da ordem de manutenção inválidos' }, { status: 400 })
  }

  try {
    const ordem = await prisma.manutencaoOS.create({
      data: {
        hospitalId: ator.hospitalId,
        equipamento: body.equipamento.trim(),
        setor: body.setor.trim(),
        tipo: body.tipo,
        prioridade: body.prioridade,
        solicitante: ator.nome,
        data: typeof body.data === 'string' ? body.data : new Date().toISOString().slice(0, 10),
        descricao: typeof body.descricao === 'string' ? body.descricao.trim() : '',
        status: 'Aberta',
      },
    })
    return NextResponse.json(ordem, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar ordem de manutenção' }, { status: 500 })
  }
}
