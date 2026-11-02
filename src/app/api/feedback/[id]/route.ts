import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado
  const { hospitalId } = ator

  try {
    const body = await lerJson(request)
    if (!body || body.status !== 'RESPONDIDO'
      || typeof body.resposta !== 'string' || !body.resposta.trim() || body.resposta.length > 2000) {
      return NextResponse.json({ error: 'Informe uma resposta válida (até 2.000 caracteres)' }, { status: 400 })
    }
    const resposta = body.resposta.trim()

    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.feedback.findFirst({ where: { id, hospitalId }, select: { status: true, mensagem: true } })
      if (!existente) return { erro: 'nao_encontrado' as const }
      if (existente.status !== 'NOVO') return { erro: 'ja_respondido' as const }

      const atualizado = await tx.feedback.updateMany({
        where: { id, hospitalId, status: 'NOVO' },
        data: { status: 'RESPONDIDO', mensagem: `${existente.mensagem}\n\n[RESPOSTA DA EQUIPE]: ${resposta}` },
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
    await auditar(ator, 'RESPONDER', 'Feedback', id)
    return NextResponse.json(resultado)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar feedback' }, { status: 500 })
  }
}
