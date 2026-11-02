import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function GET() {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const data = await prisma.procedimento.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar procedimentos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const body = await lerJson(request)
  if (
    !body
    || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 120
    || (body.codigo !== undefined && body.codigo !== null && (typeof body.codigo !== 'string' || body.codigo.length > 60))
    || (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000))
    || (body.valorBase !== undefined && body.valorBase !== null && (typeof body.valorBase !== 'number' || !Number.isFinite(body.valorBase) || body.valorBase < 0 || body.valorBase > 100000000))
    || (body.ativo !== undefined && typeof body.ativo !== 'boolean')
  ) {
    return NextResponse.json({ error: 'Procedimento inválido' }, { status: 400 })
  }

  try {
    const data = await prisma.procedimento.create({
      data: {
        hospitalId: ator.hospitalId,
        nome: body.nome.trim(),
        codigo: typeof body.codigo === 'string' ? body.codigo.trim() || null : null,
        descricao: typeof body.descricao === 'string' ? body.descricao : null,
        valorBase: typeof body.valorBase === 'number' ? body.valorBase : null,
        ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
      },
    })
    await auditar(ator, 'CRIAR', 'Procedimento', data.id)
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar procedimento' }, { status: 500 })
  }
}
