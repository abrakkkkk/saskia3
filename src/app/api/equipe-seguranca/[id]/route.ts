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
    if (!isRecord(body) || body.resolvido !== true || Object.keys(body).some(key => key !== 'resolvido')) {
      return NextResponse.json({ error: 'Somente o encerramento de uma ocorrência é permitido' }, { status: 400 })
    }

    const { id } = await params
    const atualizado = await prisma.ocorrenciaSeguranca.updateMany({
      where: { id, hospitalId, resolvido: false },
      data: {
        resolvido: true,
        resolvidoPor: session.user.name?.trim() || 'Usuário autenticado',
        dataResolucao: new Date(),
      },
    })

    if (atualizado.count === 0) {
      const existente = await prisma.ocorrenciaSeguranca.findFirst({ where: { id, hospitalId }, select: { id: true } })
      if (!existente) return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 })
      return NextResponse.json({ error: 'Esta ocorrência já foi encerrada' }, { status: 409 })
    }

    const ocorrencia = await prisma.ocorrenciaSeguranca.findFirst({ where: { id, hospitalId } })
    if (!ocorrencia) return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 })
    return NextResponse.json(ocorrencia)
  } catch (error) {
    console.error('Erro ao atualizar ocorrência de segurança:', error)
    return NextResponse.json({ error: 'Erro ao atualizar ocorrência' }, { status: 500 })
  }
}
