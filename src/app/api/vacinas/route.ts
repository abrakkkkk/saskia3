import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { configuracaoRnds, enfileirar } from '@/lib/rnds/fila'
import { lerDadosVacina } from '@/lib/rnds/tabelas'

const SELECT = {
  id: true, pacienteId: true, imunobiologico: true, fabricante: true, lote: true, validade: true, dose: true, estrategia: true,
  via: true, localAplicacao: true, grupoAtendimento: true, condicaoMaternal: true, registroOrigem: true, pais: true,
  aplicadaEm: true, profissionalNome: true, observacoes: true, createdAt: true,
} as const

// Doses aplicadas de um paciente (mais recentes primeiro), com a situação do envio à RNDS.
export async function GET(request: Request) {
  const { ator, negado } = await exigir('vacina:ler')
  if (negado) return negado
  const pacienteId = new URL(request.url).searchParams.get('pacienteId')
  if (!pacienteId) return NextResponse.json({ error: 'Informe o paciente' }, { status: 400 })
  try {
    const vacinas = await prisma.vacinaAplicada.findMany({
      where: { hospitalId: ator.hospitalId, pacienteId },
      orderBy: { aplicadaEm: 'desc' },
      take: 200,
      select: SELECT,
    })
    const envios = await prisma.envioRnds.findMany({
      where: { hospitalId: ator.hospitalId, tipo: 'RIA_R', origemId: { in: vacinas.map(v => v.id) } },
      select: { origemId: true, status: true },
    })
    const status = new Map(envios.map(e => [e.origemId, e.status]))
    return NextResponse.json(vacinas.map(v => ({ ...v, statusRnds: status.get(v.id) ?? null })))
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar as vacinas' }, { status: 500 })
  }
}

// Registra a dose aplicada. O profissional é quem está logado (o CNS dele vai para a RNDS).
export async function POST(request: Request) {
  const { ator, negado } = await exigir('vacina:registrar')
  if (negado) return negado
  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const lido = lerDadosVacina(body)
  if ('error' in lido) return NextResponse.json({ error: lido.error }, { status: 400 })
  try {
    const paciente = await prisma.paciente.findFirst({ where: { id: lido.data.pacienteId, hospitalId: ator.hospitalId, arquivadoEm: null }, select: { id: true } })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    const vacina = await prisma.vacinaAplicada.create({
      data: { ...lido.data, hospitalId: ator.hospitalId, profissionalId: ator.id, profissionalNome: ator.nome },
      select: SELECT,
    })
    await auditar(ator, 'REGISTRAR_VACINA', 'VacinaAplicada', vacina.id, { imunobiologico: vacina.imunobiologico, dose: vacina.dose })
    const config = await configuracaoRnds(ator.hospitalId)
    const envio = config.envioAutomatico
      ? await enfileirar({ hospitalId: ator.hospitalId, tipo: 'RIA_R', origemId: vacina.id, ator })
      : null
    return NextResponse.json({ ...vacina, statusRnds: envio?.status ?? null }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar a vacina' }, { status: 500 })
  }
}
