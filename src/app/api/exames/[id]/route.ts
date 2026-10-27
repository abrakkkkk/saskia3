import { NextRequest, NextResponse } from 'next/server'
import type { StatusExame } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

const statusPermitidos = new Set([
  'COLETADO',
  'EM_ANALISE',
  'CONCLUIDO',
  'ALTERADO_CRITICO',
  'CANCELADO',
])
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      || Object.keys(body).some(key => !['status', 'resultado', 'observacoes'].includes(key))
      || typeof body.status !== 'string' || !statusPermitidos.has(body.status)
      || (body.resultado !== undefined && body.resultado !== null
        && (typeof body.resultado !== 'string' || body.resultado.length > 5000))
      || (body.observacoes !== undefined && body.observacoes !== null
        && (typeof body.observacoes !== 'string' || body.observacoes.length > 2000))) {
      return NextResponse.json({ error: 'Dados do exame inválidos' }, { status: 400 })
    }

    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const exame = await tx.exame.findFirst({
        where: { id, hospitalId },
        select: { id: true, status: true },
      })
      if (!exame) return { erro: 'nao_encontrado' as const }

      if (exame.status === 'CANCELADO' || exame.status === 'CONCLUIDO' || exame.status === 'ALTERADO_CRITICO') {
        return { erro: 'encerrado' as const }
      }
      if (body.status === 'COLETADO' && exame.status !== 'SOLICITADO' && exame.status !== 'AGENDADO') {
        return { erro: 'transicao' as const }
      }
      if (body.status === 'EM_ANALISE' && exame.status !== 'COLETADO' && exame.status !== 'EM_ANALISE') {
        return { erro: 'transicao' as const }
      }
      if ((body.status === 'CONCLUIDO' || body.status === 'ALTERADO_CRITICO')
        && ((exame.status !== 'COLETADO' && exame.status !== 'EM_ANALISE')
          || typeof body.resultado !== 'string' || !body.resultado.trim())) {
        return { erro: 'resultado' as const }
      }

      const data: { status: StatusExame; resultado?: string | null; observacoes?: string | null } = {
        status: body.status as StatusExame,
      }
      if (body.resultado !== undefined) data.resultado = typeof body.resultado === 'string' && body.resultado.trim() ? body.resultado.trim() : null
      if (body.observacoes !== undefined) data.observacoes = typeof body.observacoes === 'string' && body.observacoes.trim() ? body.observacoes.trim() : null

      const atualizado = await tx.exame.updateMany({
        where: { id, hospitalId, status: exame.status },
        data,
      })
      if (!atualizado.count) return { erro: 'conflito' as const }

      return tx.exame.findFirst({
        where: { id, hospitalId },
        include: { paciente: { select: { nome: true, cpf: true } } },
      })
    })

    if (!resultado) return NextResponse.json({ error: 'Não foi possível atualizar o exame' }, { status: 500 })
    if ('erro' in resultado) {
      if (resultado.erro === 'nao_encontrado') return NextResponse.json({ error: 'Exame não encontrado' }, { status: 404 })
      if (resultado.erro === 'resultado') return NextResponse.json({ error: 'Informe o resultado antes de concluir o exame' }, { status: 400 })
      if (resultado.erro === 'transicao') return NextResponse.json({ error: 'Transição de status inválida para este exame' }, { status: 409 })
      if (resultado.erro === 'encerrado') return NextResponse.json({ error: 'Este exame já foi encerrado' }, { status: 409 })
      return NextResponse.json({ error: 'O exame foi atualizado em paralelo. Atualize a tela.' }, { status: 409 })
    }
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao atualizar exame:', error)
    return NextResponse.json({ error: 'Erro ao atualizar exame' }, { status: 500 })
  }
}
