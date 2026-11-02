import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { lerValidade, normalizarCategoria } from '@/lib/estoque'

const CAMPOS = new Set(['nome', 'categoria', 'subcategoria', 'unidade', 'minimo', 'lote', 'validade', 'fornecedor', 'localizacao', 'motivo'])

/** Dados cadastrais do item. O saldo só muda por movimentação (ENTRADA, SAIDA ou AJUSTE com motivo). */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('estoque:gerir')
    if (negado) return negado

    const { id } = await params
    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    if ('quantidade' in input) {
      return NextResponse.json({ error: 'O saldo só pode ser alterado por movimentação de ajuste com motivo' }, { status: 400 })
    }
    if (Object.keys(input).some(campo => !CAMPOS.has(campo))) {
      return NextResponse.json({ error: 'Campo não permitido' }, { status: 400 })
    }

    const data: Prisma.EstoqueItemUncheckedUpdateManyInput = {}
    if (input.nome !== undefined) {
      if (typeof input.nome !== 'string' || !input.nome.trim() || input.nome.length > 200) {
        return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
      }
      data.nome = input.nome.trim()
    }
    if (input.categoria !== undefined) {
      const categoria = normalizarCategoria(input.categoria)
      if (!categoria) return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
      data.categoria = categoria
    }
    for (const campo of ['subcategoria', 'unidade', 'lote', 'fornecedor', 'localizacao'] as const) {
      const valor = input[campo]
      if (valor === undefined) continue
      if (valor !== null && (typeof valor !== 'string' || valor.length > 200)) {
        return NextResponse.json({ error: `Campo ${campo} inválido` }, { status: 400 })
      }
      data[campo] = typeof valor === 'string' && valor.trim() ? valor.trim() : null
    }
    if (input.minimo !== undefined) {
      if (typeof input.minimo !== 'number' || !Number.isSafeInteger(input.minimo) || input.minimo < 0 || input.minimo > 2_147_483_647) {
        return NextResponse.json({ error: 'Mínimo deve ser um inteiro não negativo' }, { status: 400 })
      }
      data.minimo = input.minimo
    }
    if (input.validade !== undefined) {
      const vazia = input.validade === null || input.validade === ''
      const validade = vazia ? null : lerValidade(input.validade)
      if (!vazia && !validade) return NextResponse.json({ error: 'Data de validade inválida' }, { status: 400 })
      data.validade = validade
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 })

    // Lote e validade definem o que pode sair do estoque: a alteração exige motivo e fica na trilha.
    const motivo = typeof input.motivo === 'string' ? input.motivo.trim().slice(0, 500) : ''
    if ((data.lote !== undefined || data.validade !== undefined) && !motivo) {
      return NextResponse.json({ error: 'Informe o motivo para alterar lote ou validade' }, { status: 400 })
    }

    const antes = await prisma.estoqueItem.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: { nome: true, categoria: true, lote: true, validade: true, minimo: true },
    })
    if (!antes) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    const atualizado = await prisma.estoqueItem.updateMany({ where: { id, hospitalId: ator.hospitalId }, data })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    await auditar(ator, 'ESTOQUE_ITEM_EDITADO', 'EstoqueItem', id, {
      antes: { ...antes, validade: antes.validade?.toISOString() ?? null },
      campos: Object.keys(data),
      motivo: motivo || null,
    })
    return NextResponse.json(await prisma.estoqueItem.findFirst({ where: { id, hospitalId: ator.hospitalId } }))
  } catch (error) {
    console.error('Erro ao atualizar item de estoque:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao atualizar item de estoque' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('estoque:gerir')
    if (negado) return negado

    const { id } = await params
    const item = await prisma.estoqueItem.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: { id: true, nome: true, lote: true, quantidade: true, _count: { select: { movimentacoes: true } } },
    })
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    if (item._count.movimentacoes > 0) {
      return NextResponse.json({ error: 'Item com movimentações não pode ser excluído' }, { status: 409 })
    }

    const removido = await prisma.estoqueItem.deleteMany({ where: { id, hospitalId: ator.hospitalId } })
    if (removido.count === 0) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    await auditar(ator, 'ESTOQUE_ITEM_EXCLUIDO', 'EstoqueItem', id, { nome: item.nome, lote: item.lote, quantidade: item.quantidade })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'Item com movimentações não pode ser excluído' }, { status: 409 })
    }
    console.error('Erro ao excluir item de estoque:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao excluir item de estoque' }, { status: 500 })
  }
}
