import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('operacao:gerir')
  if (negado) return negado

  try {
    const body = await lerJson(request)
    if (!body || Object.keys(body).length !== 1 || body.status !== 'Concluída') {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const { id } = await params
    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = await prisma.manutencaoOS.updateMany({
      where: { ...where, status: 'Aberta' },
      data: { status: 'Concluída' },
    })
    if (atualizado.count === 0) {
      const existente = await prisma.manutencaoOS.findFirst({ where, select: { id: true } })
      if (!existente) return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'Esta OS já foi concluída' }, { status: 409 })
    }

    await auditar(ator, 'CONCLUIR', 'ManutencaoOS', id)
    return NextResponse.json(await prisma.manutencaoOS.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar ordem de manutenção' }, { status: 500 })
  }
}
