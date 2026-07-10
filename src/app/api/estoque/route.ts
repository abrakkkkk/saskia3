import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')

    const hospitalId = session.user.hospitalId
    const items = await prisma.estoqueItem.findMany({
      where: { 
        hospitalId,
        ...(categoria ? { categoria } : {})
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Erro ao buscar estoque:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.nome || !body.categoria || body.quantidade === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const item = await prisma.estoqueItem.create({
      data: {
        hospitalId,
        categoria: body.categoria, // 'FARMACIA' ou 'ALMOXARIFADO'
        nome: body.nome,
        quantidade: Number(body.quantidade),
        unidade: body.unidade || 'un',
        minimo: body.minimo ? Number(body.minimo) : 0,
        lote: body.lote || null,
        validade: body.validade ? new Date(body.validade) : null,
        fornecedor: body.fornecedor || null,
        valorUnit: body.valorUnit ? Number(body.valorUnit) : null
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar item de estoque:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
