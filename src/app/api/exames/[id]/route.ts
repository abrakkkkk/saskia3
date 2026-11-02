import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, StatusExame } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { pode, type Permissao } from '@/lib/permissions'

const PERMISSAO_POR_STATUS: Record<string, Permissao> = {
  COLETADO: 'exame:coletar',
  EM_ANALISE: 'exame:coletar',
  CONCLUIDO: 'exame:laudar',
  ALTERADO_CRITICO: 'exame:laudar',
  CANCELADO: 'exame:solicitar',
}

/** Só avança o status e grava o laudo em `resultado`. Os dados da solicitação nunca são alterados aqui. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('autenticado')
    if (negado) return negado

    const body = await lerJson(request)
    if (!body
      || Object.keys(body).some(key => !['status', 'resultado'].includes(key))
      || typeof body.status !== 'string' || !PERMISSAO_POR_STATUS[body.status]
      || (body.resultado !== undefined && body.resultado !== null
        && (typeof body.resultado !== 'string' || body.resultado.length > 5000))) {
      return NextResponse.json({ error: 'Dados do exame inválidos' }, { status: 400 })
    }
    if (!pode(ator.cargo, PERMISSAO_POR_STATUS[body.status])) {
      return NextResponse.json({ error: 'Você não tem permissão para esta ação' }, { status: 403 })
    }

    const { id } = await params
    const novoStatus = body.status as StatusExame
    const laudando = novoStatus === 'CONCLUIDO' || novoStatus === 'ALTERADO_CRITICO'
    const laudo = typeof body.resultado === 'string' ? body.resultado.trim() : ''

    const exame = await prisma.exame.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      select: { id: true, status: true, pacienteId: true, nome: true },
    })
    if (!exame) return NextResponse.json({ error: 'Exame não encontrado' }, { status: 404 })

    if (exame.status === 'CANCELADO' || exame.status === 'CONCLUIDO' || exame.status === 'ALTERADO_CRITICO') {
      return NextResponse.json({ error: 'Este exame já foi encerrado' }, { status: 409 })
    }
    const transicaoValida =
      novoStatus === 'CANCELADO'
      || (novoStatus === 'COLETADO' && (exame.status === 'SOLICITADO' || exame.status === 'AGENDADO'))
      || (novoStatus === 'EM_ANALISE' && (exame.status === 'COLETADO' || exame.status === 'EM_ANALISE'))
      || (laudando && (exame.status === 'COLETADO' || exame.status === 'EM_ANALISE'))
    if (!transicaoValida) {
      return NextResponse.json({ error: 'Transição de status inválida para este exame' }, { status: 409 })
    }
    if (laudando && !laudo) {
      return NextResponse.json({ error: 'Informe o resultado antes de concluir o exame' }, { status: 400 })
    }

    const data: Prisma.ExameUncheckedUpdateManyInput = { status: novoStatus }
    if (laudando) {
      data.resultado = laudo
      data.liberadoPorId = ator.id
      data.liberadoEm = new Date()
    }

    const atualizado = await prisma.exame.updateMany({
      where: { id, hospitalId: ator.hospitalId, status: exame.status },
      data,
    })
    if (!atualizado.count) {
      return NextResponse.json({ error: 'O exame foi atualizado em paralelo. Atualize a tela.' }, { status: 409 })
    }

    await auditar(ator, `EXAME_${novoStatus}`, 'Exame', id, { de: exame.status, pacienteId: exame.pacienteId, nome: exame.nome })
    return NextResponse.json(await prisma.exame.findFirst({
      where: { id, hospitalId: ator.hospitalId },
      include: {
        paciente: { select: { nome: true, nascimento: true } },
        solicitante: { select: { nome: true } },
        liberadoPor: { select: { nome: true } },
      },
    }))
  } catch (error) {
    console.error('Erro ao atualizar exame:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao atualizar exame' }, { status: 500 })
  }
}
