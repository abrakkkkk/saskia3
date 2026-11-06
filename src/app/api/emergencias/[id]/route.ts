import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

/** Encerra o alerta (situação resolvida). Fica gravado com quem encerrou e quando. */
export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('emergencia:encerrar')
  if (negado) return negado

  const { id } = await params
  try {
    const feito = await prisma.emergencia.updateMany({
      where: { id, hospitalId: ator.hospitalId, status: 'ATIVA' },
      data: { status: 'ENCERRADA', encerradaEm: new Date(), encerradaPorId: ator.id, encerradaPorNome: ator.nome },
    })
    if (feito.count === 0) return NextResponse.json({ error: 'Alerta não encontrado ou já encerrado.' }, { status: 404 })
    await auditar(ator, 'EMERGENCIA_ENCERRADA', 'Emergencia', id)
    return NextResponse.json({ id, status: 'ENCERRADA' })
  } catch {
    return NextResponse.json({ error: 'Não foi possível encerrar o alerta.' }, { status: 500 })
  }
}
