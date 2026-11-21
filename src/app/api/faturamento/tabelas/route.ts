import { NextRequest, NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { respostaErro } from '@/lib/faturamento/servidor'

const TABELAS = new Set(['22', '18', '19', '20', '38', 'SIGTAP'])
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Busca no catálogo global TUSS/SIGTAP (sem dado de paciente). ?tabela=22&q=consulta
export async function GET(request: NextRequest) {
  try {
    const { negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const tabela = request.nextUrl.searchParams.get('tabela') ?? ''
    const q = semAcento((request.nextUrl.searchParams.get('q') ?? '').trim()).slice(0, 80)
    if (!TABELAS.has(tabela)) return NextResponse.json({ error: 'Tabela inválida' }, { status: 400 })
    if (q.length < 2) return NextResponse.json([])
    const termos = q.split(/\s+/).filter(Boolean).slice(0, 5)
    const itens = await prisma.procedimentoTabela.findMany({
      where: { tabela, ativo: true, AND: termos.map(t => ({ busca: { contains: t } })) },
      orderBy: { codigo: 'asc' },
      take: 30,
      select: { codigo: true, descricao: true, versao: true, valorSh: true, valorSa: true, valorSp: true, instrumentos: true },
    })
    const versao = itens[0]?.versao ?? (await prisma.procedimentoTabela.findFirst({ where: { tabela }, select: { versao: true } }))?.versao ?? null
    return NextResponse.json({ versao, itens })
  } catch (error) {
    return respostaErro(error, 'buscar na tabela')
  }
}
