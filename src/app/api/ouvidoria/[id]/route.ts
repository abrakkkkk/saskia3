import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { anexarResposta, separarResposta, STATUS_OUVIDORIA } from '@/lib/ouvidoria'

const CAMPOS = {
  id: true, protocolo: true, tipo: true, setor: true, paciente: true,
  mensagem: true, status: true, prazo: true, createdAt: true,
} as const

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    const status = body?.status
    if (typeof status !== 'string' || !(STATUS_OUVIDORIA as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }
    const resposta = typeof body?.resposta === 'string' ? body.resposta.trim() : ''
    if (resposta.length > 4000) return NextResponse.json({ error: 'Resposta muito longa' }, { status: 400 })
    if (status === 'RESPONDIDA' && !resposta) {
      return NextResponse.json({ error: 'Escreva a resposta antes de marcar como respondida' }, { status: 400 })
    }

    const where = { id, hospitalId: ator.hospitalId }
    const atual = await prisma.ouvidoriaTicket.findFirst({ where, select: { mensagem: true, status: true } })
    if (!atual) return NextResponse.json({ error: 'Manifestação não encontrada' }, { status: 404 })

    // updateMany condicionado ao status lido evita sobrescrever uma resposta simultânea.
    const atualizado = await prisma.ouvidoriaTicket.updateMany({
      where: { ...where, status: atual.status, mensagem: atual.mensagem },
      data: { status, ...(resposta ? { mensagem: anexarResposta(atual.mensagem, resposta) } : {}) },
    })
    if (atualizado.count === 0) {
      return NextResponse.json({ error: 'A manifestação foi alterada. Atualize a tela e tente novamente.' }, { status: 409 })
    }

    await auditar(ator, 'ATUALIZAR_STATUS', 'OuvidoriaTicket', id, { status })
    const item = await prisma.ouvidoriaTicket.findFirst({ where, select: CAMPOS })
    return NextResponse.json(item ? { ...item, ...separarResposta(item.mensagem) } : null)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar manifestação' }, { status: 500 })
  }
}
