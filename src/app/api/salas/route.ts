import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const salas = await prisma.sala.findMany({
      where: { hospitalId },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(salas, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
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
    if (!isRecord(body)
      || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 120
      || !Number.isSafeInteger(body.capacidade) || Number(body.capacidade) < 1 || Number(body.capacidade) > 2_147_483_647) {
      return NextResponse.json({ error: 'Informe o nome e uma capacidade válida para a sala' }, { status: 400 })
    }
    for (const [field, maximum] of [['tipo', 100], ['setor', 100], ['andar', 80], ['equipamentos', 500], ['obs', 2000]] as const) {
      const value = body[field]
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > maximum)) {
        return NextResponse.json({ error: `Campo ${field} inválido` }, { status: 400 })
      }
    }

    const sala = await prisma.sala.create({
      data: {
        hospitalId,
        nome: body.nome.trim(),
        tipo: typeof body.tipo === 'string' && body.tipo.trim() ? body.tipo.trim() : null,
        setor: typeof body.setor === 'string' && body.setor.trim() ? body.setor.trim() : null,
        andar: typeof body.andar === 'string' && body.andar.trim() ? body.andar.trim() : null,
        capacidade: Number(body.capacidade),
        equipamentos: typeof body.equipamentos === 'string' && body.equipamentos.trim() ? body.equipamentos.trim() : null,
        obs: typeof body.obs === 'string' && body.obs.trim() ? body.obs.trim() : null,
        status: 'LIVRE',
      }
    })

    return NextResponse.json(sala, { status: 201 })
  } catch (error) {
    console.error('Erro ao cadastrar sala:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar sala' }, { status: 500 })
  }
}
