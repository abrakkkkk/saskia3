import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type PrioridadeTicket, type StatusTicket } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { compararSenha } from '@/lib/password'
import { pode } from '@/lib/permissions'

const PRIORIDADES = new Set<string>(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'])
const STATUS = new Set<string>(['ENVIADO', 'EM_ANALISE', 'RESOLVIDO', 'FECHADO'])

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    const resposta = typeof body?.resposta === 'string' ? body.resposta.trim() : ''
    if (!body || Object.keys(body).length === 0 || Object.keys(body).some(key => !['status', 'prioridade', 'resposta'].includes(key))
      || (body.status !== undefined && (typeof body.status !== 'string' || !STATUS.has(body.status)))
      || (body.prioridade !== undefined && (typeof body.prioridade !== 'string' || !PRIORIDADES.has(body.prioridade)))
      || (body.resposta !== undefined && (!resposta || resposta.length > 4000))) {
      return NextResponse.json({ error: 'Atualização de ticket inválida' }, { status: 400 })
    }

    const where = { id, hospitalId: ator.hospitalId }
    // A resposta é anexada no servidor, com autor da sessão: o histórico não vem mais do cliente.
    const ticket = await prisma.$transaction(async tx => {
      const atual = await tx.ticket.findFirst({ where, select: { respostas: true } })
      if (!atual) return null
      const respostas = Array.isArray(atual.respostas) ? atual.respostas : []
      await tx.ticket.updateMany({
        where,
        data: {
          ...(typeof body.status === 'string' ? { status: body.status as StatusTicket } : {}),
          ...(typeof body.prioridade === 'string' ? { prioridade: body.prioridade as PrioridadeTicket } : {}),
          ...(resposta ? { respostas: [...respostas, { resposta, respondente: ator.nome, data: new Date().toISOString() }] as Prisma.InputJsonValue } : {}),
        },
      })
      return tx.ticket.findFirst({ where })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!ticket) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    await auditar(ator, 'ATUALIZAR', 'Ticket', id, { status: ticket.status, respondeu: !!resposta })
    return NextResponse.json(ticket)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'O chamado foi alterado em paralelo. Tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar ticket' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    if (!body || typeof body.senha !== 'string' || !body.senha || body.senha.length > 256) {
      return NextResponse.json({ error: 'Confirme a exclusão com sua senha' }, { status: 400 })
    }
    const usuario = await prisma.usuario.findFirst({ where: { id: ator.id, hospitalId: ator.hospitalId }, select: { senha: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    if (!await compararSenha(body.senha, usuario.senha)) return NextResponse.json({ error: 'Senha incorreta' }, { status: 403 })

    const where = pode(ator.cargo, 'admin:acesso')
      ? { id, hospitalId: ator.hospitalId }
      : { id, hospitalId: ator.hospitalId, creatorId: ator.id }
    const removido = await prisma.ticket.deleteMany({ where })
    if (removido.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    await auditar(ator, 'EXCLUIR', 'Ticket', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir ticket' }, { status: 500 })
  }
}
