import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'

const statusEncerrados = ['FINALIZADA', 'CANCELADA'] as const

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('operacao:abrir')
  if (negado) return negado
  const { hospitalId } = ator

  try {
    const body = await lerJson(request)
    const status = body?.status
    if (status !== statusEncerrados[0] && status !== statusEncerrados[1]) {
      return NextResponse.json({ error: 'Status de encerramento inválido' }, { status: 400 })
    }

    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.reservaSala.findFirst({
        where: { id, hospitalId },
        select: { id: true, salaId: true, status: true, profissional: true },
      })
      if (!existente) return { erro: 'nao_encontrada' as const }
      // Sem vínculo por id no schema: o dono é identificado pelo nome gravado da sessão.
      if (!pode(ator.cargo, 'operacao:gerir') && existente.profissional !== ator.nome) return { erro: 'sem_permissao' as const }
      if (existente.status !== 'ATIVA' && existente.status !== 'RESERVADA') return { erro: 'ja_encerrada' as const }

      const atualizada = await tx.reservaSala.updateMany({
        where: { id: existente.id, hospitalId, status: { in: ['ATIVA', 'RESERVADA'] } },
        data: { status },
      })
      if (atualizada.count === 0) return { erro: 'ja_encerrada' as const }

      const abertas = await tx.reservaSala.findMany({
        where: { salaId: existente.salaId, hospitalId, status: { in: ['ATIVA', 'RESERVADA'] } },
        select: { status: true },
      })
      const statusSala = abertas.some(reserva => reserva.status === 'ATIVA')
        ? 'OCUPADO'
        : abertas.length > 0 ? 'RESERVADO' : 'LIVRE'

      await tx.sala.updateMany({
        where: { id: existente.salaId, hospitalId, status: { in: ['LIVRE', 'RESERVADO', 'OCUPADO'] } },
        data: { status: statusSala },
      })
      return tx.reservaSala.findFirst({ where: { id, hospitalId } })
    })

    if (!resultado) return NextResponse.json({ error: 'Não foi possível atualizar a reserva' }, { status: 500 })
    if ('erro' in resultado) {
      if (resultado.erro === 'nao_encontrada') return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
      if (resultado.erro === 'sem_permissao') return NextResponse.json({ error: 'Só quem reservou ou a gestão pode encerrar esta reserva' }, { status: 403 })
      return NextResponse.json({ error: 'Esta reserva já foi encerrada' }, { status: 409 })
    }
    await auditar(ator, 'ENCERRAR', 'ReservaSala', id, { status })
    return NextResponse.json(resultado)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar reserva' }, { status: 500 })
  }
}
