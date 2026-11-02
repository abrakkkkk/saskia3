import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

const TIPOS_CAMPO = new Set(['texto', 'numero', 'data', 'textarea', 'select'])

function parseCampos(value: unknown): { campos?: Array<{ id?: string; nome: string; tipo: string }>; error?: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return { error: 'Adicione de 1 a 100 campos válidos' }
  const campos: Array<{ id?: string; nome: string; tipo: string }> = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.nome !== 'string' || !item.nome.trim() || item.nome.trim().length > 120 || typeof item.tipo !== 'string' || !TIPOS_CAMPO.has(item.tipo)) {
      return { error: 'Um ou mais campos do modelo são inválidos' }
    }
    const campo: { id?: string; nome: string; tipo: string } = { nome: item.nome.trim(), tipo: item.tipo }
    if (typeof item.id === 'string' && item.id.length <= 64) campo.id = item.id
    campos.push(campo)
  }
  return { campos }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    if (!body || Object.keys(body).length === 0 || Object.keys(body).some(key => !['titulo', 'descricao', 'campos'].includes(key))) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (body.titulo !== undefined && (typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.trim().length > 160)) {
      return NextResponse.json({ error: 'Título inválido' }, { status: 400 })
    }
    if (body.descricao !== undefined && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) {
      return NextResponse.json({ error: 'Descrição inválida' }, { status: 400 })
    }
    const parsed = body.campos === undefined ? undefined : parseCampos(body.campos)
    if (parsed?.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const where = { id, hospitalId: ator.hospitalId }
    const atualizado = await prisma.modeloProntuario.updateMany({
      where,
      data: {
        ...(typeof body.titulo === 'string' ? { titulo: body.titulo.trim() } : {}),
        ...(typeof body.descricao === 'string' ? { descricao: body.descricao.trim() } : {}),
        ...(parsed?.campos ? { campos: parsed.campos } : {}),
      },
    })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    await auditar(ator, 'ATUALIZAR', 'ModeloProntuario', id)
    return NextResponse.json(await prisma.modeloProntuario.findFirst({ where }))
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar modelo' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    const removido = await prisma.modeloProntuario.deleteMany({ where: { id, hospitalId: ator.hospitalId } })
    if (removido.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    await auditar(ator, 'EXCLUIR', 'ModeloProntuario', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir modelo' }, { status: 500 })
  }
}
