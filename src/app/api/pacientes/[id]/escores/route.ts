import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento } from '@/lib/pacientes'

const LIMITES_GLASGOW = { ocular: 4, verbal: 5, motor: 6 }
const LIMITES_BRADEN = { sensorial: 4, umidade: 4, atividade: 4, mobilidade: 4, nutricao: 4, friccao: 3 }

function escalaValida(valor: unknown, limites: Record<string, number>): valor is Record<string, number> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) &&
    Object.entries(limites).every(([chave, maximo]) => {
      const nota = (valor as Record<string, unknown>)[chave]
      return typeof nota === 'number' && Number.isInteger(nota) && nota >= 1 && nota <= maximo
    })
}

// Cada escala é independente: grava só o que foi avaliado, nunca um valor presumido.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('escores:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const temGlasgow = body.glasgow !== undefined && body.glasgow !== null
    const temBraden = body.braden !== undefined && body.braden !== null
    const temDor = body.dor !== undefined && body.dor !== null
    if (!temGlasgow && !temBraden && !temDor) {
      return NextResponse.json({ error: 'Informe ao menos uma escala' }, { status: 400 })
    }
    if (temGlasgow && !escalaValida(body.glasgow, LIMITES_GLASGOW)) {
      return NextResponse.json({ error: 'Glasgow incompleto ou inválido' }, { status: 400 })
    }
    if (temBraden && !escalaValida(body.braden, LIMITES_BRADEN)) {
      return NextResponse.json({ error: 'Braden incompleto ou inválido' }, { status: 400 })
    }
    if (temDor && (!Number.isInteger(body.dor) || Number(body.dor) < 0 || Number(body.dor) > 10)) {
      return NextResponse.json({ error: 'Valor de dor inválido' }, { status: 400 })
    }

    const avaliadas = [temGlasgow && 'Glasgow', temBraden && 'Braden', temDor && 'Dor'].filter(Boolean).join(', ')
    const item = await prisma.$transaction(async tx => {
      const criado = await tx.escoreClinico.create({
        data: {
          pacienteId: id,
          ...(temGlasgow ? { glasgow: body.glasgow as Prisma.InputJsonObject } : {}),
          ...(temBraden ? { braden: body.braden as Prisma.InputJsonObject } : {}),
          ...(temDor ? { dor: body.dor as number } : {}),
          profissional: ator.nome,
          usuarioId: ator.id,
        },
      })
      await registrarEvento(tx, ator, id, 'Escores', `Escalas avaliadas: ${avaliadas}`)
      return criado
    })

    await auditar(ator, 'REGISTRAR_ESCORES', 'EscoreClinico', item.id, { pacienteId: id })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar escores:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
