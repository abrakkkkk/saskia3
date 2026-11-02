import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

const TIPOS_CAMPO = new Set(['texto', 'numero', 'data', 'textarea', 'select'])
const MAX_CAMPOS = 100

function parseCampos(value: unknown): { campos?: Array<{ id?: string; nome: string; tipo: string }>; error?: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CAMPOS) return { error: 'Adicione de 1 a 100 campos válidos' }
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

export async function GET() {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const modelos = await prisma.modeloProntuario.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(modelos, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar modelos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body || typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.trim().length > 160
    || (body.descricao !== undefined && (typeof body.descricao !== 'string' || body.descricao.length > 2000))) {
    return NextResponse.json({ error: 'Título ou descrição inválidos' }, { status: 400 })
  }
  const parsed = parseCampos(body.campos)
  if (parsed.error || !parsed.campos) return NextResponse.json({ error: parsed.error || 'Campos inválidos' }, { status: 400 })

  try {
    const modelo = await prisma.modeloProntuario.create({
      data: {
        hospitalId: ator.hospitalId,
        titulo: body.titulo.trim(),
        descricao: typeof body.descricao === 'string' ? body.descricao.trim() : '',
        campos: parsed.campos,
      },
    })
    await auditar(ator, 'CRIAR', 'ModeloProntuario', modelo.id)
    return NextResponse.json(modelo, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar modelo' }, { status: 500 })
  }
}
