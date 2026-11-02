import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('seguranca:gerir')
  if (negado) return negado

  try {
    const body = await lerJson(request)
    if (!body || body.resolvido !== true || Object.keys(body).some(key => key !== 'resolvido')) {
      return NextResponse.json({ error: 'Somente o encerramento de uma ocorrência é permitido' }, { status: 400 })
    }

    const { id } = await params
    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = await prisma.ocorrenciaSeguranca.updateMany({
      where: { ...where, resolvido: false },
      data: { resolvido: true, resolvidoPor: ator.nome, dataResolucao: new Date() },
    })
    if (atualizado.count === 0) {
      const existente = await prisma.ocorrenciaSeguranca.findFirst({ where, select: { id: true } })
      if (!existente) return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'Esta ocorrência já foi encerrada' }, { status: 409 })
    }

    await auditar(ator, 'ENCERRAR', 'OcorrenciaSeguranca', id)
    return NextResponse.json(await prisma.ocorrenciaSeguranca.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar ocorrência' }, { status: 500 })
  }
}
