import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('operacao:gerir')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    if (!body || body.status !== 'Concluído') {
      return NextResponse.json({ error: 'Transição de transporte inválida' }, { status: 400 })
    }

    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = await prisma.transportePaciente.updateMany({
      where: { ...where, status: 'Pendente' },
      data: { status: 'Concluído' },
    })
    if (atualizado.count === 0) {
      const existente = await prisma.transportePaciente.findFirst({ where, select: { id: true } })
      if (!existente) return NextResponse.json({ error: 'Transporte não encontrado' }, { status: 404 })
      return NextResponse.json({ error: 'Este transporte já foi concluído' }, { status: 409 })
    }

    await auditar(ator, 'CONCLUIR', 'TransportePaciente', id)
    return NextResponse.json(await prisma.transportePaciente.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar transporte' }, { status: 500 })
  }
}
