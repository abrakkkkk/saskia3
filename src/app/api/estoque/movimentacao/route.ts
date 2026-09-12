import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    const body = await request.json()
    const { tipo, itemId, quantidade, pacienteId, setor, fornecedor, responsavel, observacao } = body

    if (!tipo || !itemId || !quantidade || !responsavel) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    if (pacienteId) {
      const paciente = await prisma.paciente.findUnique({
        where: { id: pacienteId }
      })
      if (!paciente || paciente.hospitalId !== hospitalId) {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }
    }

    // Execute in a transaction to guarantee data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current item
      const item = await tx.estoqueItem.findUnique({ where: { id: itemId } })
      if (!item) throw new Error('Item não encontrado no estoque')

      // 2. Validate Saida
      if (tipo === 'SAIDA' && item.quantidade < Number(quantidade)) {
        throw new Error(`Estoque insuficiente. Disponível: ${item.quantidade}`)
      }

      // 3. Create Movimentacao
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          hospitalId,
          tipo,
          itemId,
          quantidade: Number(quantidade),
          pacienteId: pacienteId || null,
          usuarioId,
          setor: setor || null,
          fornecedor: fornecedor || null,
          responsavel,
          observacao: observacao || null
        }
      })

      // 4. Update EstoqueItem quantity
      const incrementValue = tipo === 'ENTRADA' ? Number(quantidade) : -Number(quantidade)
      await tx.estoqueItem.update({
        where: { id: itemId },
        data: { quantidade: { increment: incrementValue } }
      })

      return mov
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao registrar movimentação:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
