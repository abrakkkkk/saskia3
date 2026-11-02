import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function PUT(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('recepcao:operar')
    if (negado) return negado

    const { id } = await params
    const hospitalId = ator.hospitalId
    const atualizado = await prisma.visitante.updateMany({
      where: { id, hospitalId, status: 'DENTRO' },
      data: { status: 'SAIU', saida: new Date() },
    })
    if (atualizado.count === 0) {
      const existente = await prisma.visitante.findFirst({ where: { id, hospitalId }, select: { id: true } })
      return existente
        ? NextResponse.json({ error: 'A saída deste visitante já foi registrada' }, { status: 409 })
        : NextResponse.json({ error: 'Visitante não encontrado' }, { status: 404 })
    }

    await auditar(ator, 'REGISTRAR_SAIDA_VISITANTE', 'Visitante', id)
    const visitante = await prisma.visitante.findFirst({ where: { id, hospitalId } })
    return NextResponse.json(visitante)
  } catch (error) {
    console.error('Erro ao atualizar visitante:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar saída do visitante' }, { status: 500 })
  }
}
