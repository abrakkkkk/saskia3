import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body) || (body.status !== 'MANUTENCAO' && body.status !== 'LIVRE')) {
      return NextResponse.json({ error: 'Transição de sala inválida' }, { status: 400 })
    }

    const updated = body.status === 'MANUTENCAO'
      ? await prisma.sala.updateMany({
          where: { id, hospitalId, status: { in: ['LIVRE', 'RESERVADO'] } },
          data: { status: 'MANUTENCAO' },
        })
      : await prisma.sala.updateMany({
          where: { id, hospitalId, status: 'MANUTENCAO' },
          data: { status: 'LIVRE' },
        })

    if (updated.count === 0) {
      const sala = await prisma.sala.findFirst({ where: { id, hospitalId }, select: { id: true } })
      if (!sala) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'A sala mudou de estado. Atualize a tela e tente novamente.' }, { status: 409 })
    }

    const sala = await prisma.sala.findFirst({ where: { id, hospitalId } })
    return NextResponse.json(sala)
  } catch (error) {
    console.error('Erro ao atualizar sala:', error)
    return NextResponse.json({ error: 'Erro ao atualizar sala' }, { status: 500 })
  }
}
