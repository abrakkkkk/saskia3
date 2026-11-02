import { NextResponse } from 'next/server'
import { exigir, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const contatos = await prisma.usuario.findMany({
      where: { hospitalId: ator.hospitalId, ativo: true },
      orderBy: { nome: 'asc' },
      take: LIMITE_LISTA,
      select: { id: true, nome: true, email: true, cargo: true },
    })
    return NextResponse.json(contatos)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar contatos' }, { status: 500 })
  }
}
