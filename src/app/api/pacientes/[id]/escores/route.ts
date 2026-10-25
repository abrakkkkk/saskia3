import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Cargo sem permissão para registrar escores clínicos' }, { status: 403 })
    }

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const input = body as Record<string, unknown>
    const isScore = (value: unknown, limits: Record<string, number>) =>
      typeof value === 'object' && value !== null && !Array.isArray(value) &&
      Object.entries(limits).every(([key, max]) => {
        const score = (value as Record<string, unknown>)[key]
        return typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= max
      })
    if (!isScore(input.glasgow, { ocular: 4, verbal: 5, motor: 6 }) ||
        !isScore(input.braden, { sensorial: 4, umidade: 4, atividade: 4, mobilidade: 4, nutricao: 4, friccao: 3 })) {
      return NextResponse.json({ error: 'Valores dos escores incompletos ou inválidos' }, { status: 400 })
    }
    if (input.dor !== null && (!Number.isInteger(input.dor) || Number(input.dor) < 0 || Number(input.dor) > 10)) {
      return NextResponse.json({ error: 'Valor de dor inválido' }, { status: 400 })
    }
    const paciente = await prisma.paciente.findFirst({
      where: { id, hospitalId },
      select: { id: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const profissional = session.user.name || 'Sistema'

    const item = await prisma.escoreClinico.create({
      data: {
        pacienteId: id,
        glasgow: input.glasgow as Prisma.InputJsonObject,
        dor: input.dor as number | null,
        braden: input.braden as Prisma.InputJsonObject,
        profissional,
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
