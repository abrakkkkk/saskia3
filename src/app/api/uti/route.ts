import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const leitos = await prisma.utiLeito.findMany({
      where: { hospitalId },
      orderBy: { numero: 'asc' },
    })

    return NextResponse.json(leitos)
  } catch (error) {
    console.error('Erro ao buscar leitos:', error)
    return NextResponse.json({ error: 'Erro ao buscar leitos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const input = body as Record<string, unknown>

    const numero = Number(input.numero)
    if (!Number.isSafeInteger(numero) || numero < 1 || numero > 2_147_483_647
      || !['ADULTO', 'PEDIATRICO', 'NEONATAL'].includes(String(input.tipo))) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const leitoExistente = await prisma.utiLeito.findFirst({ where: { hospitalId, numero }, select: { id: true } })
    if (leitoExistente) return NextResponse.json({ error: 'Já existe um leito com este número neste hospital' }, { status: 409 })

    const leito = await prisma.utiLeito.create({ data: { hospitalId, numero, tipo: input.tipo as 'ADULTO' | 'PEDIATRICO' | 'NEONATAL', status: 'LIVRE' } })

    return NextResponse.json(leito, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar leito:', error)
    return NextResponse.json({ error: 'Erro ao criar leito' }, { status: 500 })
  }
}
