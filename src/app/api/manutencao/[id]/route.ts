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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body) || Object.keys(body).length !== 1 || body.status !== 'Concluída') {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const { id } = await params
    const atualizado = await prisma.manutencaoOS.updateMany({
      where: { id, hospitalId, status: 'Aberta' },
      data: { status: 'Concluída' },
    })
    if (atualizado.count === 0) {
      const existente = await prisma.manutencaoOS.findFirst({ where: { id, hospitalId }, select: { id: true } })
      if (!existente) return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'Esta OS já foi concluída' }, { status: 409 })
    }

    return NextResponse.json(await prisma.manutencaoOS.findFirst({ where: { id, hospitalId } }))
  } catch (error) {
    console.error('Erro ao concluir OS de manutenção:', error)
    return NextResponse.json({ error: 'Erro ao atualizar ordem de manutenção' }, { status: 500 })
  }
}
