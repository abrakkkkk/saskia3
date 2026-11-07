import { NextRequest, NextResponse } from 'next/server'
import { del, get } from '@vercel/blob'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { exigirPlataforma } from '@/lib/plataforma'
import { SLUG_VALIDO } from '@/lib/documentos'

type Ctx = { params: Promise<{ slug: string }> }

/** Entrega o arquivo do Blob privado. Só quem está logado; o endereço do Blob nunca chega ao navegador. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { negado } = await exigir('autenticado')
  if (negado) return negado

  const { slug } = await params
  if (!SLUG_VALIDO.test(slug)) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  try {
    const doc = await prisma.documento.findFirst({ where: { slug, ativo: true }, select: { arquivo: true, mime: true } })
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

    const blob = await get(doc.arquivo, { access: 'private' })
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: 'Arquivo indisponível' }, { status: 404 })

    const extensao = doc.arquivo.includes('.') ? doc.arquivo.slice(doc.arquivo.lastIndexOf('.')) : ''
    const baixar = request.nextUrl.searchParams.get('baixar') === '1'
    return new Response(blob.stream, {
      headers: {
        'Content-Type': doc.mime,
        'Content-Length': String(blob.blob.size),
        'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${slug}${extensao}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao abrir o documento' }, { status: 500 })
  }
}

const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null)

/** Edita título, grupo, instituição, tags, ordem, situação (ativo) ou o nome padrão (slug). Área Plataforma. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { ator, negado } = await exigirPlataforma()
  if (negado) return negado
  const { slug } = await params

  const b = await lerJson(request)
  if (!b) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const data: Record<string, unknown> = {}
  if ('titulo' in b) { const t = texto(b.titulo, 200); if (!t) return NextResponse.json({ error: 'Título inválido' }, { status: 400 }); data.titulo = t }
  if ('slug' in b) {
    if (typeof b.slug !== 'string' || !SLUG_VALIDO.test(b.slug) || b.slug.length > 100) return NextResponse.json({ error: 'Nome de arquivo inválido' }, { status: 400 })
    data.slug = b.slug
  }
  if ('grupo' in b) data.grupo = texto(b.grupo, 80)
  if ('instituicao' in b) data.instituicao = texto(b.instituicao, 120)
  if ('ativo' in b) { if (typeof b.ativo !== 'boolean') return NextResponse.json({ error: 'Situação inválida' }, { status: 400 }); data.ativo = b.ativo }
  if ('ordem' in b) { if (!Number.isInteger(b.ordem)) return NextResponse.json({ error: 'Ordem inválida' }, { status: 400 }); data.ordem = b.ordem }
  if ('tags' in b) data.tags = Array.isArray(b.tags) ? b.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0 && t.length <= 40).slice(0, 12) : []

  try {
    const doc = await prisma.documento.update({ where: { slug }, data, select: { slug: true, titulo: true, ativo: true } })
    await auditar(ator, 'ATUALIZAR', 'Documento', doc.slug)
    return NextResponse.json(doc)
  } catch (e) {
    const code = typeof e === 'object' && e && 'code' in e ? e.code : ''
    if (code === 'P2025') return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    if (code === 'P2002') return NextResponse.json({ error: 'Já existe um documento com esse nome de arquivo' }, { status: 409 })
    return NextResponse.json({ error: 'Erro ao atualizar documento' }, { status: 500 })
  }
}

/** Remove do catálogo e, se mais ninguém usa o arquivo, do Blob. Área Plataforma. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { ator, negado } = await exigirPlataforma()
  if (negado) return negado
  const { slug } = await params

  try {
    const doc = await prisma.documento.findUnique({ where: { slug }, select: { id: true, arquivo: true } })
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    await prisma.documento.delete({ where: { id: doc.id } })
    const aindaUsado = await prisma.documento.count({ where: { arquivo: doc.arquivo } })
    if (aindaUsado === 0) await del(doc.arquivo).catch(() => undefined)
    await auditar(ator, 'EXCLUIR', 'Documento', slug)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir documento' }, { status: 500 })
  }
}
