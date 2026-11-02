import { NextRequest, NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null
  if (!DATA_ISO.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const validation = new Date(Date.UTC(year, month - 1, day))
  if (validation.getUTCFullYear() !== year || validation.getUTCMonth() !== month - 1 || validation.getUTCDate() !== day) return undefined
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}-03:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// Só agregados: nenhum nome de paciente ou de profissional sai desta rota.
export async function GET(request: NextRequest) {
  const { ator, negado } = await exigir('relatorio:ler')
  if (negado) return negado
  const { hospitalId } = ator

  try {
    const params = request.nextUrl.searchParams
    const inicioValue = params.get('inicio')
    const fimValue = params.get('fim')
    const inicio = parseDate(inicioValue)
    const fim = parseDate(fimValue, true)
    if (inicio === undefined || fim === undefined || (inicio && fim && inicio > fim)) {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 })
    }
    const janela = inicio || fim ? { gte: inicio ?? undefined, lte: fim ?? undefined } : undefined

    const [pacientesNoPeriodo, internadosAgora, obitosNoPeriodo, agendamentos, cirurgiasNoPeriodo, leitos] = await Promise.all([
      prisma.paciente.count({ where: { hospitalId, ...(janela ? { createdAt: janela } : {}) } }),
      prisma.paciente.count({ where: { hospitalId, arquivadoEm: null, status: { in: ['Internado', 'Internado - UTI'] } } }),
      prisma.obito.count({ where: { hospitalId, ...(inicioValue || fimValue ? { data: { gte: inicioValue ?? undefined, lte: fimValue ?? undefined } } : {}) } }),
      prisma.agendamento.groupBy({
        by: ['status'],
        where: { hospitalId, ...(janela ? { dataHora: janela } : {}) },
        _count: { _all: true },
      }),
      prisma.cirurgia.count({ where: { hospitalId, ...(janela ? { dataHora: janela } : {}) } }),
      prisma.utiLeito.groupBy({ by: ['tipo', 'status'], where: { hospitalId }, _count: { _all: true } }),
    ])

    return NextResponse.json({
      pacientesNoPeriodo,
      internadosAgora,
      obitosNoPeriodo,
      cirurgiasNoPeriodo,
      agendamentos: agendamentos.map(({ status, _count }) => ({ status, total: _count._all })),
      leitos: leitos.map(({ tipo, status, _count }) => ({ tipo, status, total: _count._all })),
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    console.error('Erro ao carregar dados gerenciais:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao carregar dados gerenciais' }, { status: 500 })
  }
}
