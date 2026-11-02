import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

type Contexto = { params: Promise<{ id: string }> }

function validar(body: Record<string, unknown> | null) {
  if (!body) return 'Dados inválidos'
  if (Object.keys(body).some(key => !['nome', 'codigo', 'descricao', 'valorBase', 'ativo'].includes(key))) return 'Campo não permitido'
  if (body.nome !== undefined && (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.trim().length > 120)) return 'Nome inválido'
  if (body.codigo !== undefined && body.codigo !== null && (typeof body.codigo !== 'string' || body.codigo.length > 60)) return 'Código inválido'
  if (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) return 'Descrição inválida'
  if (body.valorBase !== undefined && body.valorBase !== null && (typeof body.valorBase !== 'number' || !Number.isFinite(body.valorBase) || body.valorBase < 0 || body.valorBase > 100000000)) return 'Valor inválido'
  if (body.ativo !== undefined && typeof body.ativo !== 'boolean') return 'Status inválido'
  if (Object.keys(body).length === 0) return 'Nenhuma alteração informada'
  return null
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const body = await lerJson(request)
    const erro = validar(body)
    if (erro || !body) return NextResponse.json({ error: erro ?? 'Dados inválidos' }, { status: 400 })

    const data: { nome?: string; codigo?: string | null; descricao?: string | null; valorBase?: number | null; ativo?: boolean } = {}
    if (typeof body.nome === 'string') data.nome = body.nome.trim()
    if ('codigo' in body) data.codigo = typeof body.codigo === 'string' ? body.codigo.trim() || null : null
    if ('descricao' in body) data.descricao = typeof body.descricao === 'string' ? body.descricao.trim() || null : null
    if ('valorBase' in body) data.valorBase = typeof body.valorBase === 'number' ? body.valorBase : null
    if (typeof body.ativo === 'boolean') data.ativo = body.ativo

    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = await prisma.procedimento.updateMany({ where, data })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
    await auditar(ator, 'ATUALIZAR', 'Procedimento', id)
    return NextResponse.json(await prisma.procedimento.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar procedimento' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Contexto) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    if (!id || id.length > 64) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const atualizado = await prisma.procedimento.updateMany({
      where: { id, hospitalId: ator.hospitalId, ativo: true },
      data: { ativo: false },
    })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Procedimento ativo não encontrado' }, { status: 404 })
    await auditar(ator, 'DESATIVAR', 'Procedimento', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao desativar procedimento' }, { status: 500 })
  }
}
