import { NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import type { StatusPaciente } from '@/lib/paciente-status'

// Contagens somente com os status oficiais de lib/paciente-status.
const AGUARDANDO: StatusPaciente[] = ['Recepção', 'Aguardando Triagem', 'Aguardando Médico']
const EM_ATENDIMENTO: StatusPaciente[] = ['Em Triagem', 'Em Atendimento Médico']
const INTERNADOS: StatusPaciente[] = ['Internado', 'Internado - UTI']
const EM_CURSO: StatusPaciente[] = [...AGUARDANDO, ...EM_ATENDIMENTO, ...INTERNADOS]

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const pacientes = { hospitalId: ator.hospitalId, arquivadoEm: null }
    // Internação (item 9): internados e leitos de UTI pela internação aberta; altas e transferências
    // pelas saídas de internação nas últimas 24 horas.
    const abertas = { hospitalId: ator.hospitalId, saidaEm: null, paciente: { arquivadoEm: null } }
    const ultimas24h = { hospitalId: ator.hospitalId, saidaEm: { gte: new Date(Date.now() - 86_400_000) } }
    const [
      aguardando, emAtendimento, internados, riscoVermelho, riscoAmarelo,
      cirurgiasEmAndamento, leitosUti, totalLeitosUti, altas, evasoes, transferencias, obitos,
    ] = await Promise.all([
      prisma.paciente.count({ where: { ...pacientes, status: { in: AGUARDANDO } } }),
      prisma.paciente.count({ where: { ...pacientes, status: { in: EM_ATENDIMENTO } } }),
      prisma.internacao.count({ where: abertas }),
      prisma.paciente.count({ where: { ...pacientes, classificacao: 'Vermelho', status: { in: EM_CURSO } } }),
      prisma.paciente.count({ where: { ...pacientes, classificacao: 'Amarelo', status: { in: EM_CURSO } } }),
      prisma.cirurgia.count({ where: { hospitalId: ator.hospitalId, status: 'EM_ANDAMENTO' } }),
      prisma.internacao.count({ where: { ...abertas, utiLeitoId: { not: null } } }),
      prisma.utiLeito.count({ where: { hospitalId: ator.hospitalId } }),
      prisma.internacao.count({ where: { ...ultimas24h, tipoSaida: 'ALTA_MEDICA' } }),
      prisma.paciente.count({ where: { ...pacientes, status: 'Evasão' } }),
      prisma.internacao.count({ where: { ...ultimas24h, tipoSaida: 'TRANSFERENCIA' } }),
      prisma.obito.count({ where: { hospitalId: ator.hospitalId } }),
    ])

    return NextResponse.json({
      aguardando, emAtendimento, internados, riscoVermelho, riscoAmarelo,
      cirurgiasEmAndamento, leitosUti, totalLeitosUti, altas, evasoes, transferencias, obitos,
    })
  } catch (error) {
    console.error('Erro ao carregar indicadores:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Não foi possível carregar os indicadores do hospital' }, { status: 500 })
  }
}
