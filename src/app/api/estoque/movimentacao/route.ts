import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

class StockMovementError extends Error {}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')

    // Find all movimentacoes for items in this category
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: {
        hospitalId,
        item: categoria ? { categoria } : undefined
      },
      include: {
        item: true,
        paciente: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(movimentacoes)
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    
    const usuarioId = session.user.id

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    const { tipo, itemId, quantidade, pacienteId, setor, fornecedor, observacao } = input
    const categoria = input.categoria
    const responsavel = session.user.name?.trim() || session.user.email || 'Sistema'

    if ((tipo !== 'ENTRADA' && tipo !== 'SAIDA') || typeof itemId !== 'string' || !itemId ||
      typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > 2_147_483_647 ||
      (categoria !== undefined && categoria !== 'FARMACIA' && categoria !== 'ALMOXARIFADO')) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }
    for (const [field, value] of Object.entries({ pacienteId, setor, fornecedor, observacao })) {
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > (field === 'observacao' ? 2000 : 200))) {
        return NextResponse.json({ error: `Campo ${field} inválido` }, { status: 400 })
      }
    }

    if (typeof pacienteId === 'string' && pacienteId) {
      const paciente = await prisma.paciente.findFirst({ where: { id: pacienteId, hospitalId }, select: { id: true } })
      if (!paciente) {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }
    }

    // Debits are conditional updates so concurrent requests cannot overdraw stock.
    const result = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.estoqueItem.updateMany({
        where: {
          id: itemId,
          hospitalId,
          ...(categoria ? { categoria } : {}),
          ...(tipo === 'SAIDA' ? { quantidade: { gte: quantidade } } : { quantidade: { lte: 2_147_483_647 - quantidade } }),
        },
        data: { quantidade: { [tipo === 'ENTRADA' ? 'increment' : 'decrement']: quantidade } },
      })
      if (atualizado.count === 0) {
        const item = await tx.estoqueItem.findFirst({ where: { id: itemId, hospitalId, ...(categoria ? { categoria } : {}) }, select: { quantidade: true } })
        if (!item) throw new StockMovementError('Item não encontrado no estoque')
        if (tipo === 'SAIDA') throw new StockMovementError(`Estoque insuficiente. Disponível: ${item.quantidade}`)
        throw new StockMovementError('A quantidade final excede o limite permitido')
      }

      return tx.movimentacaoEstoque.create({
        data: {
          hospitalId,
          tipo,
          itemId,
          quantidade,
          pacienteId: typeof pacienteId === 'string' && pacienteId ? pacienteId : null,
          usuarioId,
          setor: typeof setor === 'string' && setor ? setor : null,
          fornecedor: typeof fornecedor === 'string' && fornecedor ? fornecedor : null,
          responsavel: responsavel.trim(),
          observacao: typeof observacao === 'string' && observacao ? observacao : null
        }
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao registrar movimentação:', error)
    if (error instanceof StockMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
  }
}
