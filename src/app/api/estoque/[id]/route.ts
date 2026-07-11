import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId || 'hospital_001'
    const body = await request.json()

    const item = await prisma.estoqueItem.findUnique({
      where: { id }
    })

    if (!item || item.hospitalId !== hospitalId) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    const updated = await prisma.estoqueItem.update({
      where: { id },
      data: {
        nome: body.nome !== undefined ? body.nome : item.nome,
        categoria: body.categoria !== undefined ? body.categoria : item.categoria,
        quantidade: body.quantidade !== undefined ? Number(body.quantidade) : item.quantidade,
        unidade: body.unidade !== undefined ? body.unidade : item.unidade,
        minimo: body.minimo !== undefined ? Number(body.minimo) : item.minimo,
        lote: body.lote !== undefined ? body.lote : item.lote,
        validade: body.validade ? new Date(body.validade) : item.validade,
        fornecedor: body.fornecedor !== undefined ? body.fornecedor : item.fornecedor,
        localizacao: body.localizacao !== undefined ? body.localizacao : item.localizacao
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Erro ao atualizar item de estoque:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId || 'hospital_001'

    const item = await prisma.estoqueItem.findUnique({
      where: { id }
    })

    if (!item || item.hospitalId !== hospitalId) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    await prisma.estoqueItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar item de estoque:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
