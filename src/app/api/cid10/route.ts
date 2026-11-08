import { NextRequest, NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca no CID-10 por código (J45, e119, E11.9) ou por palavras da descrição. Só devolve códigos selecionáveis. */
export async function GET(request: NextRequest) {
  const { negado } = await exigir('autenticado')
  if (negado) return negado

  const q = semAcento(request.nextUrl.searchParams.get('q') ?? '').replace(/\s+/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])
  if (q.length > 80) return NextResponse.json({ error: 'Busca muito longa' }, { status: 400 })

  try {
    // "j45" ou "e11.9": busca por código (sem ponto). Senão, cada palavra precisa aparecer na descrição.
    const porCodigo = /^[a-z]\d[\d.]*$/.test(q)
    const where = porCodigo
      ? { folha: true, busca: { startsWith: q.replace('.', '') } }
      : { folha: true, AND: q.split(' ').slice(0, 5).map(t => ({ busca: { contains: t } })) }
    const achados = await prisma.cid10.findMany({
      where,
      select: { codigo: true, descricao: true },
      orderBy: { codigo: 'asc' },
      take: 25,
    })
    return NextResponse.json(achados, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar no CID-10' }, { status: 500 })
  }
}
