import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const categorias = await prisma.categoria.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { nome: 'asc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(categorias)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const body = await lerJson(request)
  if (
    !body
    || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 100
    || (body.tipo !== undefined && (typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 60))
    || (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 1000))
  ) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
  }

  try {
    const categoria = await prisma.categoria.create({
      data: {
        hospitalId: ator.hospitalId,
        nome: body.nome.trim(),
        tipo: typeof body.tipo === 'string' ? body.tipo.trim() : 'PRODUTO',
        descricao: typeof body.descricao === 'string' ? body.descricao : null,
      },
    })
    await auditar(ator, 'CRIAR', 'Categoria', categoria.id)
    return NextResponse.json(categoria, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}
