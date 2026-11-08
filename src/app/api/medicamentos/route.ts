import { NextRequest, NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca no catálogo de medicamentos (CMED/ANVISA) por nome comercial ou substância. Qualquer pessoa logada consulta. */
export async function GET(request: NextRequest) {
  const { negado } = await exigir('autenticado')
  if (negado) return negado

  const q = semAcento(request.nextUrl.searchParams.get('q') ?? '').replace(/\s+/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])
  if (q.length > 80) return NextResponse.json({ error: 'Busca muito longa' }, { status: 400 })
  const termos = q.split(' ').slice(0, 5)

  try {
    const achados = await prisma.medicamento.findMany({
      where: { ativo: true, AND: termos.map(t => ({ busca: { contains: t } })) },
      select: { id: true, produto: true, substancia: true, apresentacao: true, laboratorio: true, tipo: true, tarja: true, classe: true, rename: true },
      orderBy: [{ produto: 'asc' }, { apresentacao: 'asc' }],
      take: 120,
    })
    // Quem começa com o que foi digitado vem primeiro; depois a ordem alfabética.
    const pontos = (m: { produto: string; substancia: string }) =>
      semAcento(m.produto).startsWith(termos[0]) ? 0 : semAcento(m.substancia).startsWith(termos[0]) ? 1 : 2
    achados.sort((a, b) => pontos(a) - pontos(b))
    return NextResponse.json(achados.slice(0, 25), { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar medicamentos' }, { status: 500 })
  }
}
