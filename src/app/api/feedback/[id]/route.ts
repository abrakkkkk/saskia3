import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem responder feedbacks' }, { status: 403 })
    }

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body) || body.status !== 'RESPONDIDO'
      || typeof body.resposta !== 'string' || !body.resposta.trim() || body.resposta.length > 2000) {
      return NextResponse.json({ error: 'Informe uma resposta válida (até 2.000 caracteres)' }, { status: 400 })
    }
    const resposta = body.resposta.trim()

    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.feedback.findFirst({ where: { id, hospitalId }, select: { id: true, status: true, mensagem: true } })
      if (!existente) return { erro: 'nao_encontrado' as const }
      if (existente.status !== 'NOVO') return { erro: 'ja_respondido' as const }

      const atualizado = await tx.feedback.updateMany({
        where: { id, hospitalId, status: 'NOVO' },
        data: {
          status: 'RESPONDIDO',
          mensagem: `${existente.mensagem}\n\n[RESPOSTA DA EQUIPE]: ${resposta}`,
        },
      })
      if (atualizado.count === 0) return { erro: 'ja_respondido' as const }

      return tx.feedback.findFirst({
        where: { id, hospitalId },
        include: { usuario: { select: { id: true, nome: true } } },
      })
    })

    if (resultado && 'erro' in resultado) {
      if (resultado.erro === 'nao_encontrado') return NextResponse.json({ error: 'Feedback não encontrado' }, { status: 404 })
      return NextResponse.json({ error: 'Este feedback já foi respondido' }, { status: 409 })
    }
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error)
    return NextResponse.json({ error: 'Erro ao atualizar feedback' }, { status: 500 })
  }
}
