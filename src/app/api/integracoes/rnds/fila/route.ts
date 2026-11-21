import { NextResponse } from 'next/server'
import type { StatusEnvioRnds } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { descricaoCodigo } from '@/lib/rnds/validador'
import { SISTEMA } from '@/lib/rnds/documentos'
import { enfileirar, processarPendentes } from '@/lib/rnds/fila'
import { lerDadosExame } from '@/lib/rnds/tabelas'

const STATUS: StatusEnvioRnds[] = ['PENDENTE', 'ENVIADO', 'ERRO', 'SIMULADO']

// Itens da fila (mais recentes primeiro), com paciente e o que foi enviado, para o gestor corrigir e reenviar.
export async function GET(request: Request) {
  const { ator, negado } = await exigir('integracao:ler')
  if (negado) return negado
  const status = new URL(request.url).searchParams.get('status') as StatusEnvioRnds | null
  if (status && !STATUS.includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  try {
    const envios = await prisma.envioRnds.findMany({
      where: { hospitalId: ator.hospitalId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true, tipo: true, origemId: true, status: true, ambiente: true, tentativas: true, ultimoErro: true, problemas: true,
        idRnds: true, enviadoEm: true, createdAt: true, updatedAt: true,
      },
    })
    const idsVacina = envios.filter(e => e.tipo === 'RIA_R').map(e => e.origemId)
    const idsExame = envios.filter(e => e.tipo === 'REL').map(e => e.origemId)
    const [vacinas, exames] = await Promise.all([
      prisma.vacinaAplicada.findMany({ where: { hospitalId: ator.hospitalId, id: { in: idsVacina } }, select: { id: true, imunobiologico: true, dose: true, aplicadaEm: true, paciente: { select: { nome: true } } } }),
      prisma.exame.findMany({ where: { hospitalId: ator.hospitalId, id: { in: idsExame } }, select: { id: true, nome: true, liberadoEm: true, paciente: { select: { nome: true } } } }),
    ])
    const origem = new Map<string, { paciente: string; descricao: string; data: Date | null }>()
    for (const v of vacinas) origem.set(v.id, { paciente: v.paciente.nome, descricao: `${descricaoCodigo(SISTEMA.imunobiologico, v.imunobiologico) ?? v.imunobiologico} · ${descricaoCodigo(SISTEMA.dose, v.dose) ?? v.dose}`, data: v.aplicadaEm })
    for (const e of exames) origem.set(e.id, { paciente: e.paciente.nome, descricao: e.nome, data: e.liberadoEm })
    return NextResponse.json(envios.map(e => ({ ...e, ...(origem.get(e.origemId) ?? { paciente: null, descricao: 'Registro removido', data: null }) })))
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar a fila da RNDS' }, { status: 500 })
  }
}

// { acao: 'processar' } processa os pendentes; { acao: 'enfileirar-exame', exameId, ...códigos } põe um exame liberado na fila.
export async function POST(request: Request) {
  const { ator, negado } = await exigir('integracao:gerir')
  if (negado) return negado
  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    if (body.acao === 'processar') {
      const resultados = await processarPendentes(ator.hospitalId)
      const resumo = Object.fromEntries(STATUS.map(s => [s, resultados.filter(r => r.status === s).length]))
      await auditar(ator, 'PROCESSAR_FILA_RNDS', 'EnvioRnds', null, resumo)
      return NextResponse.json({ processados: resultados.length, resumo })
    }
    if (body.acao === 'enfileirar-exame') {
      if (typeof body.exameId !== 'string') return NextResponse.json({ error: 'Informe o exame' }, { status: 400 })
      const exame = await prisma.exame.findFirst({ where: { id: body.exameId, hospitalId: ator.hospitalId }, select: { id: true, liberadoEm: true } })
      if (!exame) return NextResponse.json({ error: 'Exame não encontrado' }, { status: 404 })
      if (!exame.liberadoEm) return NextResponse.json({ error: 'Só exames com laudo liberado vão para a RNDS' }, { status: 409 })
      const dados = lerDadosExame(body)
      if ('error' in dados) return NextResponse.json({ error: dados.error }, { status: 400 })
      const envio = await enfileirar({ hospitalId: ator.hospitalId, tipo: 'REL', origemId: exame.id, ator, dadosExame: dados.data })
      await auditar(ator, 'ENFILEIRAR_RNDS', 'EnvioRnds', envio.id, { tipo: 'REL' })
      return NextResponse.json({ id: envio.id, status: envio.status }, { status: 201 })
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar a fila da RNDS' }, { status: 500 })
  }
}
