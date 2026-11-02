import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const { id } = await params
  const body = await lerJson(request)
  if (
    !body
    || (!('nome' in body) && !('tipo' in body) && !('descricao' in body))
    || (body.nome !== undefined && (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 100))
    || (body.tipo !== undefined && (typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 60))
    || (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 1000))
  ) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
  }

  const data = {
    ...(typeof body.nome === 'string' ? { nome: body.nome.trim() } : {}),
    ...(typeof body.tipo === 'string' ? { tipo: body.tipo.trim() } : {}),
    ...(typeof body.descricao === 'string' || body.descricao === null ? { descricao: body.descricao } : {}),
  }

  try {
    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = await prisma.categoria.updateMany({ where, data })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    await auditar(ator, 'ATUALIZAR', 'Categoria', id)
    return NextResponse.json(await prisma.categoria.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const { id } = await params
  try {
    const removido = await prisma.categoria.deleteMany({ where: { id, hospitalId: ator.hospitalId } })
    if (removido.count === 0) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    await auditar(ator, 'EXCLUIR', 'Categoria', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 })
  }
}
