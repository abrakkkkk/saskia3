import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

const statusEncerrados = ['FINALIZADA', 'CANCELADA'] as const

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body) || !statusEncerrados.includes(body.status as typeof statusEncerrados[number])) {
      return NextResponse.json({ error: 'Status de encerramento inválido' }, { status: 400 })
    }

    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.reservaSala.findFirst({
        where: { id, hospitalId },
        select: { id: true, salaId: true, status: true },
      })
      if (!existente) return { erro: 'nao_encontrada' as const }
      if (existente.status !== 'ATIVA' && existente.status !== 'RESERVADA') {
        return { erro: 'ja_encerrada' as const }
      }

      const atualizada = await tx.reservaSala.updateMany({
        where: { id: existente.id, hospitalId, status: { in: ['ATIVA', 'RESERVADA'] } },
        data: { status: body.status as string },
      })
      if (atualizada.count === 0) return { erro: 'ja_encerrada' as const }

      const reservasAbertas = await tx.reservaSala.findMany({
        where: { salaId: existente.salaId, hospitalId, status: { in: ['ATIVA', 'RESERVADA'] } },
        select: { status: true },
      })
      const statusSala = reservasAbertas.some(reserva => reserva.status === 'ATIVA')
        ? 'OCUPADO'
        : reservasAbertas.length > 0 ? 'RESERVADO' : 'LIVRE'

      await tx.sala.updateMany({
        where: { id: existente.salaId, hospitalId, status: { in: ['LIVRE', 'RESERVADO', 'OCUPADO'] } },
        data: { status: statusSala },
      })

      return tx.reservaSala.findFirst({ where: { id, hospitalId } })
    })

    if (!resultado) return NextResponse.json({ error: 'Não foi possível atualizar a reserva' }, { status: 500 })
    if ('erro' in resultado) {
      if (resultado.erro === 'nao_encontrada') return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'Esta reserva já foi encerrada' }, { status: 409 })
    }
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao encerrar reserva de sala:', error)
    return NextResponse.json({ error: 'Erro ao atualizar reserva' }, { status: 500 })
  }
}
