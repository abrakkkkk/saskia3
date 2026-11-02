import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { estadoApos, normalizarTipo, PROXIMOS } from '@/lib/ponto'

const CAMPOS = {
  id: true, tipo: true, dataHora: true, localizacao: true,
  usuario: { select: { id: true, nome: true } },
} as const

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const data = await prisma.pontoRegistro.findMany({
      where: { hospitalId: ator.hospitalId, usuarioId: ator.id },
      select: CAMPOS,
      orderBy: { dataHora: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  const tipo = typeof body?.tipo === 'string' ? normalizarTipo(body.tipo) : null
  const localizacao = body?.localizacao
  if (!tipo || (localizacao !== undefined && localizacao !== null && (typeof localizacao !== 'string' || localizacao.length > 200))) {
    return NextResponse.json({ error: 'Tipo de ponto inválido' }, { status: 400 })
  }

  try {
    const resultado = await prisma.$transaction(async tx => {
      const ultimo = await tx.pontoRegistro.findFirst({
        where: { hospitalId: ator.hospitalId, usuarioId: ator.id },
        orderBy: { dataHora: 'desc' },
        select: { tipo: true },
      })
      if (!PROXIMOS[estadoApos(ultimo?.tipo)].includes(tipo)) return null
      return tx.pontoRegistro.create({
        data: {
          hospitalId: ator.hospitalId,
          usuarioId: ator.id,
          tipo,
          // Horário do servidor: o relógio do cliente não é aceito.
          dataHora: new Date(),
          localizacao: typeof localizacao === 'string' && localizacao.trim() ? localizacao.trim() : null,
        },
        select: CAMPOS,
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!resultado) return NextResponse.json({ error: 'Este registro não é válido para a situação atual da sua jornada. Atualize a tela.' }, { status: 409 })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Registro simultâneo detectado. Atualize a tela.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao registrar ponto' }, { status: 500 })
  }
}
