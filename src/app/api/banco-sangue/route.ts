import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

const tiposPermitidos = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
const quantidadeMaxima = 2_147_483_647

function statusDoEstoque(quantidade: number) {
  return quantidade < 5 ? 'CRÍTICO' : quantidade < 15 ? 'ALERTA' : 'NORMAL'
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const grupos = await prisma.estoqueSangue.groupBy({
      by: ['tipo'],
      where: { hospitalId },
      _sum: { quantidade: true },
    })
    const estoque = grupos.map(item => {
      const quantidade = item._sum.quantidade ?? 0
      return { id: item.tipo, tipo: item.tipo, quantidade, status: statusDoEstoque(quantidade) }
    }).sort((a, b) => a.tipo.localeCompare(b.tipo))

    return NextResponse.json(estoque)
  } catch (error) {
    console.error('Erro ao consultar estoque de sangue:', error)
    return NextResponse.json({ error: 'Erro ao consultar estoque de sangue' }, { status: 500 })
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
    if (!isRecord(body) || typeof body.tipo !== 'string' || !tiposPermitidos.has(body.tipo)
      || typeof body.quantidade !== 'number' || !Number.isSafeInteger(body.quantidade)
      || body.quantidade < 0 || body.quantidade > quantidadeMaxima) {
      return NextResponse.json({ error: 'Tipo sanguíneo ou quantidade inválida' }, { status: 400 })
    }

    const resultado = await prisma.$transaction(async tx => {
      const registros = await tx.estoqueSangue.findMany({
        where: { hospitalId, tipo: body.tipo as string },
        orderBy: { createdAt: 'asc' },
        select: { id: true, quantidade: true },
      })
      const totalAtual = registros.reduce((sum, registro) => sum + registro.quantidade, 0)
      const total = totalAtual + (body.quantidade as number)
      if (!Number.isSafeInteger(total) || total > quantidadeMaxima) return { erro: 'limite' as const }

      const status = statusDoEstoque(total)
      const existing = registros[0]
      if (existing) {
        await tx.estoqueSangue.updateMany({
          where: { hospitalId, id: { in: registros.map(registro => registro.id) } },
          data: { status },
        })
        await tx.estoqueSangue.updateMany({
          where: { id: existing.id, hospitalId },
          data: { quantidade: existing.quantidade + (body.quantidade as number) },
        })
        return tx.estoqueSangue.findFirst({ where: { id: existing.id, hospitalId } })
      }
      return tx.estoqueSangue.create({
        data: { hospitalId, tipo: body.tipo as string, quantidade: total, status },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (resultado && 'erro' in resultado) {
      return NextResponse.json({ error: 'A quantidade final excede o limite permitido' }, { status: 400 })
    }
    if (!resultado) return NextResponse.json({ error: 'Não foi possível registrar o estoque' }, { status: 500 })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar estoque de sangue:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'O estoque foi atualizado simultaneamente. Atualize os dados e tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao registrar estoque de sangue' }, { status: 500 })
  }
}
