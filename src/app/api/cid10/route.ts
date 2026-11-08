import { NextRequest, NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const semAcento = (t: string) => t.normalize('NFD').replace(/[Ì€-Í¯]/g, '').toLowerCase()

/** Busca no CID-10 por cÃ³digo (J45, e119, E11.9) ou por palavras da descriÃ§Ã£o. SÃ³ devolve cÃ³digos selecionÃ¡veis. */
export async function GET(request: NextRequest) {
  const { negado } = await exigir('autenticado')
  if (negado) return negado

  const q = semAcento(request.nextUrl.searchParams.get('q') ?? '').replace(/\s+/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])
  if (q.length > 80) return NextResponse.json({ error: 'Busca muito longa' }, { status: 400 })

  try {
    // "j45" ou "e11.9": busca por cÃ³digo (sem ponto). SenÃ£o, cada palavra precisa aparecer na descriÃ§Ã£o.
    const porCodigo = /^[a-z]\d[\d.]*$/.test(q)
    const where = porCodigo
      ? { folha: true, busca: { startsWith: q.replace('.', '') } }
      : { folha: true, AND: q.split(' ').slice(0, 5).map(t => ({ busca: { contains: t } })) }
    const achados = await prisma.cid10.findMany({
      where,
      select: { codigo: true, descricao: true, busca: true },
      orderBy: { codigo: 'asc' },
      take: 1000,
    })
    // Por nome: descriÃ§Ã£o que COMEÃ‡A com a palavra vem primeiro, depois palavra inteira em qualquer ponto, por fim o resto
    // (evita "asma" trazer "Mycoplasma" antes de "Asma").
    const primeiro = q.split(' ')[0]
    const pontos = (busca: string) => {
      const texto = busca.slice(busca.indexOf(' ') + 1)
      return texto.startsWith(primeiro) ? 0 : texto.includes(` ${primeiro}`) ? 1 : 2
    }
    if (!porCodigo) achados.sort((a, b) => pontos(a.busca) - pontos(b.busca))
    return NextResponse.json(achados.slice(0, 25).map(({ codigo, descricao }) => ({ codigo, descricao })), { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar no CID-10' }, { status: 500 })
  }
}

