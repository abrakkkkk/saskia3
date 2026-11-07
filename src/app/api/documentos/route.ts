import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { exigirPlataforma } from '@/lib/plataforma'
import { ehCategoria, SLUG_VALIDO } from '@/lib/documentos'

const CAMPOS = { slug: true, titulo: true, categoria: true, grupo: true, instituicao: true, tags: true, mime: true, tamanho: true } as const
const CAMPOS_GESTAO = { ...CAMPOS, ordem: true, ativo: true, arquivo: true, updatedAt: true } as const

/** Lista o acervo. Qualquer pessoa logada lê. Com ?gerenciar=1 (área Plataforma) vem tudo, inclusive os desativados. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const gerenciar = params.get('gerenciar') === '1'
  const { negado } = gerenciar ? await exigirPlataforma() : await exigir('autenticado')
  if (negado) return negado

  const categoria = params.get('categoria')
  if (categoria && !ehCategoria(categoria)) return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })

  try {
    const documentos = await prisma.documento.findMany({
      where: { ...(categoria ? { categoria } : {}), ...(gerenciar ? {} : { ativo: true }) },
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }, { titulo: 'asc' }],
      select: gerenciar ? CAMPOS_GESTAO : CAMPOS,
    })
    return NextResponse.json(documentos, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
  }
}

const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null)

/** Registra no catálogo um arquivo que já foi enviado ao Blob (área Plataforma). */
export async function POST(request: Request) {
  const { ator, negado } = await exigirPlataforma()
  if (negado) return negado

  const b = await lerJson(request)
  const slug = typeof b?.slug === 'string' ? b.slug : ''
  const titulo = texto(b?.titulo, 200)
  const arquivo = texto(b?.arquivo, 300)
  const mime = texto(b?.mime, 100)
  if (!SLUG_VALIDO.test(slug) || slug.length > 100 || !titulo || !arquivo || !mime || !ehCategoria(b?.categoria)
    || typeof b?.tamanho !== 'number' || !Number.isInteger(b.tamanho) || b.tamanho <= 0) {
    return NextResponse.json({ error: 'Dados do documento inválidos' }, { status: 400 })
  }
  const tags = Array.isArray(b.tags) ? b.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0 && t.length <= 40).slice(0, 12) : []

  try {
    const doc = await prisma.documento.create({
      data: {
        slug, titulo, arquivo, mime, tamanho: b.tamanho, categoria: b.categoria, tags,
        grupo: texto(b.grupo, 80), instituicao: texto(b.instituicao, 120),
        hash: texto(b.hash, 128) ?? 'sem-hash', ordem: typeof b.ordem === 'number' && Number.isInteger(b.ordem) ? b.ordem : 0,
      },
      select: CAMPOS_GESTAO,
    })
    await auditar(ator, 'CRIAR', 'Documento', doc.slug)
    return NextResponse.json(doc, { status: 201 })
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um documento com esse nome de arquivo' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao salvar documento' }, { status: 500 })
  }
}
