import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('operacao:gerir')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    if (!body || (body.status !== 'MANUTENCAO' && body.status !== 'LIVRE')) {
      return NextResponse.json({ error: 'Transição de sala inválida' }, { status: 400 })
    }

    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = body.status === 'MANUTENCAO'
      ? await prisma.sala.updateMany({ where: { ...where, status: { in: ['LIVRE', 'RESERVADO'] } }, data: { status: 'MANUTENCAO' } })
      : await prisma.sala.updateMany({ where: { ...where, status: 'MANUTENCAO' }, data: { status: 'LIVRE' } })

    if (atualizado.count === 0) {
      const sala = await prisma.sala.findFirst({ where, select: { id: true } })
      if (!sala) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'A sala mudou de estado. Atualize a tela e tente novamente.' }, { status: 409 })
    }

    await auditar(ator, 'ATUALIZAR_STATUS', 'Sala', id, { status: body.status })
    return NextResponse.json(await prisma.sala.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar sala' }, { status: 500 })
  }
}
