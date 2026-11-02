import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'

export async function GET() {
  try {
    const { ator, negado } = await exigir('uti:ler')
    if (negado) return negado

    const leitos = await prisma.utiLeito.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { numero: 'asc' },
      take: LIMITE_LISTA,
    })

    return NextResponse.json(leitos)
  } catch {
    console.error('Erro ao buscar leitos de UTI')
    return NextResponse.json({ error: 'Erro ao buscar leitos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('uti:gerir')
    if (negado) return negado

    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const numero = Number(input.numero)
    const tipo = input.tipo
    if (!Number.isSafeInteger(numero) || numero < 1 || numero > 2_147_483_647
      || (tipo !== 'ADULTO' && tipo !== 'PEDIATRICO' && tipo !== 'NEONATAL')) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Não há índice único no banco: a transação Serializable impede o número duplicado.
    const leito = await prisma.$transaction(async (tx) => {
      const existente = await tx.utiLeito.findFirst({ where: { hospitalId: ator.hospitalId, numero }, select: { id: true } })
      if (existente) return null
      return tx.utiLeito.create({ data: { hospitalId: ator.hospitalId, numero, tipo, status: 'LIVRE' } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!leito) return NextResponse.json({ error: 'Já existe um leito com este número neste hospital' }, { status: 409 })

    await auditar(ator, 'uti.leito_criar', 'UtiLeito', leito.id, { numero, tipo })
    return NextResponse.json(leito, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Outro leito foi criado em paralelo. Tente novamente.' }, { status: 409 })
    }
    console.error('Erro ao criar leito de UTI')
    return NextResponse.json({ error: 'Erro ao criar leito' }, { status: 500 })
  }
}
