import { NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { garantirCanais } from '@/lib/chat'

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado
  try {
    const canais = await garantirCanais(ator.hospitalId)
    return NextResponse.json(canais.map(c => ({ id: c.id, slug: c.slug, nome: c.nome, descricao: c.descricao })))
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar canais' }, { status: 500 })
  }
}
