import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    const allowedFields = new Set(['nome', 'categoria', 'subcategoria', 'quantidade', 'unidade', 'minimo', 'lote', 'validade', 'fornecedor', 'localizacao'])
    if (Object.keys(input).some(field => !allowedFields.has(field))) {
      return NextResponse.json({ error: 'Campo não permitido' }, { status: 400 })
    }
    if (Object.keys(input).length === 0) return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 })

    for (const field of ['nome', 'categoria'] as const) {
      if (input[field] !== undefined && (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > 200)) {
        return NextResponse.json({ error: `Campo ${field} inválido` }, { status: 400 })
      }
    }
    for (const field of ['unidade', 'lote', 'fornecedor', 'localizacao', 'subcategoria'] as const) {
      const value = input[field]
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 200)) {
        return NextResponse.json({ error: `Campo ${field} inválido` }, { status: 400 })
      }
    }
    for (const field of ['quantidade', 'minimo'] as const) {
      const value = input[field]
      if (value !== undefined && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647)) {
        return NextResponse.json({ error: `Campo ${field} deve ser um inteiro não negativo` }, { status: 400 })
      }
    }
    let validade: Date | null | undefined
    if (input.validade !== undefined) {
      if (input.validade === null || input.validade === '') {
        validade = null
      } else if (typeof input.validade === 'string') {
        validade = new Date(input.validade)
        if (Number.isNaN(validade.getTime())) return NextResponse.json({ error: 'Data de validade inválida' }, { status: 400 })
      } else {
        return NextResponse.json({ error: 'Data de validade inválida' }, { status: 400 })
      }
    }

    const item = await prisma.estoqueItem.findFirst({ where: { id, hospitalId } })
    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    const data: Prisma.EstoqueItemUncheckedUpdateManyInput = {}
    if (input.nome !== undefined) data.nome = (input.nome as string).trim()
    if (input.categoria !== undefined) data.categoria = (input.categoria as string).trim()
    if (input.subcategoria !== undefined) data.subcategoria = input.subcategoria as string | null
    if (input.quantidade !== undefined) data.quantidade = input.quantidade as number
    if (input.unidade !== undefined) data.unidade = input.unidade as string | null
    if (input.minimo !== undefined) data.minimo = input.minimo as number
    if (input.lote !== undefined) data.lote = input.lote as string | null
    if (validade !== undefined) data.validade = validade
    if (input.fornecedor !== undefined) data.fornecedor = input.fornecedor as string | null
    if (input.localizacao !== undefined) data.localizacao = input.localizacao as string | null

    const updated = await prisma.estoqueItem.updateMany({
      where: { id, hospitalId },
      data,
    })
    if (updated.count === 0) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    return NextResponse.json(await prisma.estoqueItem.findFirst({ where: { id, hospitalId } }))
  } catch (error: unknown) {
    console.error('Erro ao atualizar item de estoque:', error)
    const message = error instanceof Error ? error.message : 'Erro ao atualizar item de estoque'
    return NextResponse.json({ error: message }, { status: message === 'Erro ao atualizar item de estoque' ? 500 : 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const item = await prisma.estoqueItem.findFirst({ where: { id, hospitalId }, select: { id: true } })
    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    const removido = await prisma.estoqueItem.deleteMany({ where: { id, hospitalId } })
    if (removido.count === 0) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar item de estoque:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
