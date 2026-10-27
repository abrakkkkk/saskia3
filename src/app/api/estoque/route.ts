import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
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
    return NextResponse.json({ error: 'Erro ao buscar estoque' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const quantidade = typeof body.quantidade === 'number' ? body.quantidade : Number(body.quantidade)
    const minimo = body.minimo === undefined || body.minimo === null || body.minimo === '' ? 0 : Number(body.minimo)
    if (
      typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 200 ||
      !['FARMACIA', 'ALMOXARIFADO'].includes(String(body.categoria)) ||
      !Number.isInteger(quantidade) || quantidade < 0 || quantidade > 2147483647 ||
      !Number.isInteger(minimo) || minimo < 0 || minimo > 2147483647 ||
      (body.codigo !== undefined && body.codigo !== null && (typeof body.codigo !== 'string' || body.codigo.length > 100)) ||
      (body.subcategoria !== undefined && body.subcategoria !== null && (typeof body.subcategoria !== 'string' || body.subcategoria.length > 100)) ||
      (body.registrarMovimentacaoInicial !== undefined && typeof body.registrarMovimentacaoInicial !== 'boolean') ||
      (body.unidade !== undefined && body.unidade !== null && (typeof body.unidade !== 'string' || body.unidade.length > 30)) ||
      (body.lote !== undefined && body.lote !== null && (typeof body.lote !== 'string' || body.lote.length > 100)) ||
      (body.fornecedor !== undefined && body.fornecedor !== null && (typeof body.fornecedor !== 'string' || body.fornecedor.length > 200))
    ) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }
    const nome = body.nome.trim()
    const validade = body.validade ? new Date(String(body.validade)) : null
    if (body.validade && (!validade || Number.isNaN(validade.getTime()))) {
      return NextResponse.json({ error: 'Data de validade inválida' }, { status: 400 })
    }

    const item = await prisma.$transaction(async tx => {
      const criado = await tx.estoqueItem.create({
        data: {
          hospitalId,
          categoria: body.categoria as 'FARMACIA' | 'ALMOXARIFADO',
          subcategoria: typeof body.subcategoria === 'string' && body.subcategoria.trim() ? body.subcategoria.trim() : null,
          nome,
          codigo: typeof body.codigo === 'string' && body.codigo.trim() ? body.codigo.trim() : null,
          quantidade,
          unidade: typeof body.unidade === 'string' && body.unidade.trim() ? body.unidade.trim() : 'un',
          minimo,
          lote: typeof body.lote === 'string' && body.lote.trim() ? body.lote.trim() : null,
          validade,
          fornecedor: typeof body.fornecedor === 'string' && body.fornecedor.trim() ? body.fornecedor.trim() : null
        }
      })

      if (body.registrarMovimentacaoInicial === true && quantidade > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            hospitalId,
            tipo: 'ENTRADA',
            itemId: criado.id,
            quantidade,
            fornecedor: 'Estoque Inicial',
            responsavel: session.user.name || 'Sistema',
            usuarioId: session.user.id,
          }
        })
      }

      return criado
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar item de estoque:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
