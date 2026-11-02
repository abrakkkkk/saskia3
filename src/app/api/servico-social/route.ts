import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'

const SEM_CACHE = { 'Cache-Control': 'private, no-store, max-age=0' }
const statusPermitidos = new Set(['Em Andamento', 'Aguardando Retorno', 'Concluído'])
const tiposPermitidos = new Set([
  'Orientação Social',
  'Acolhimento',
  'Visita Domiciliar',
  'Entrevista Social',
  'Grupo de Apoio',
])
const demandasPermitidas = new Set([
  'Vulnerabilidade Social',
  'Violência Doméstica',
  'Abandono Familiar',
  'Dependência Química',
  'Moradia/Habitação',
  'Benefícios/Previdência',
  'Documentação',
  'Óbito/Trâmites',
  'Alta Hospitalar Complexa',
  'Outra',
])

function dataValida(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function GET() {
  try {
    const { ator, negado } = await exigir('social:ler')
    if (negado) return negado

    const casos = await prisma.casoSocial.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    })
    // Dado sensível: toda leitura fica registrada, sem copiar o conteúdo para a trilha.
    await auditar(ator, 'servico_social.ler', 'CasoSocial', null, { total: casos.length })
    return NextResponse.json(casos, { headers: SEM_CACHE })
  } catch {
    console.error('Erro ao buscar casos do Serviço Social')
    return NextResponse.json({ error: 'Erro ao buscar casos do Serviço Social' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('social:gerir')
    if (negado) return negado

    const body = await lerJson(request)
    const camposPermitidos = ['pacienteId', 'situacao', 'tipo', 'status', 'data', 'relato', 'encaminhamentos']
    if (!body
      || Object.keys(body).some(campo => !camposPermitidos.includes(campo))
      || typeof body.pacienteId !== 'string' || !body.pacienteId.trim() || body.pacienteId.length > 64
      || typeof body.situacao !== 'string' || !demandasPermitidas.has(body.situacao)
      || typeof body.tipo !== 'string' || !tiposPermitidos.has(body.tipo)
      || typeof body.status !== 'string' || !statusPermitidos.has(body.status)
      || typeof body.data !== 'string' || !dataValida(body.data)
      || typeof body.relato !== 'string' || !body.relato.trim() || body.relato.length > 4000
      || (body.encaminhamentos !== undefined && (typeof body.encaminhamentos !== 'string' || body.encaminhamentos.length > 1000))) {
      return NextResponse.json({ error: 'Confira os dados do atendimento social' }, { status: 400 })
    }

    const paciente = await prisma.paciente.findFirst({
      where: { id: body.pacienteId.trim(), hospitalId: ator.hospitalId, arquivadoEm: null },
      select: { id: true, nome: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 })

    const detalhe = [
      `Tipo de atendimento: ${body.tipo}`,
      `Profissional: ${ator.nome}`,
      `Data do atendimento: ${body.data}`,
      `Relato / evolução: ${body.relato.trim()}`,
      typeof body.encaminhamentos === 'string' && body.encaminhamentos.trim()
        ? `Encaminhamentos: ${body.encaminhamentos.trim()}`
        : '',
    ].filter(Boolean).join('\n')

    const caso = await prisma.casoSocial.create({
      data: {
        hospitalId: ator.hospitalId,
        pacienteNome: paciente.nome,
        situacao: body.situacao,
        detalhe,
        status: body.status,
      },
    })
    await auditar(ator, 'servico_social.registrar', 'CasoSocial', caso.id, { pacienteId: paciente.id })
    return NextResponse.json(caso, { status: 201, headers: SEM_CACHE })
  } catch {
    console.error('Erro ao registrar atendimento social')
    return NextResponse.json({ error: 'Erro ao registrar atendimento social' }, { status: 500 })
  }
}

// O histórico só cresce: o PATCH muda o status e acrescenta linhas, nunca reescreve `detalhe`.
export async function PATCH(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('social:gerir')
    if (negado) return negado

    const body = await lerJson(request)
    if (!body
      || Object.keys(body).some(campo => !['id', 'status', 'acrescimo'].includes(campo))
      || typeof body.id !== 'string' || !body.id.trim()
      || (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status)))
      || (body.acrescimo !== undefined && (typeof body.acrescimo !== 'string' || body.acrescimo.length > 2000))) {
      return NextResponse.json({ error: 'Dados de atualização inválidos' }, { status: 400 })
    }
    const acrescimo = typeof body.acrescimo === 'string' ? body.acrescimo.trim() : ''
    const novoStatus = typeof body.status === 'string' ? body.status : undefined
    if (!acrescimo && !novoStatus) return NextResponse.json({ error: 'Informe o status ou o acréscimo ao histórico' }, { status: 400 })

    const { hospitalId } = ator
    const caso = await prisma.casoSocial.findFirst({
      where: { id: body.id.trim(), hospitalId },
      select: { id: true, detalhe: true, status: true },
    })
    if (!caso) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

    const mudouStatus = novoStatus !== undefined && novoStatus !== caso.status
    if (!acrescimo && !mudouStatus) return NextResponse.json(await prisma.casoSocial.findFirst({ where: { id: caso.id, hospitalId } }))

    const carimbo = `[${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} - ${ator.nome}]`
    const linhas = [
      mudouStatus ? `${carimbo} Status alterado de "${caso.status}" para "${novoStatus}".` : '',
      acrescimo ? `${carimbo} ${acrescimo}` : '',
    ].filter(Boolean)

    // A condição sobre `detalhe` evita perder um acréscimo feito por outra pessoa no mesmo instante.
    const atualizado = await prisma.casoSocial.updateMany({
      where: { id: caso.id, hospitalId, detalhe: caso.detalhe },
      data: {
        detalhe: `${caso.detalhe}\n${linhas.join('\n')}`,
        ...(mudouStatus ? { status: novoStatus } : {}),
      },
    })
    if (!atualizado.count) return NextResponse.json({ error: 'O caso foi atualizado por outra pessoa. Atualize a tela e tente novamente.' }, { status: 409 })

    await auditar(ator, 'servico_social.atualizar', 'CasoSocial', caso.id, { mudouStatus, comAcrescimo: Boolean(acrescimo) })
    return NextResponse.json(await prisma.casoSocial.findFirst({ where: { id: caso.id, hospitalId } }), { headers: SEM_CACHE })
  } catch {
    console.error('Erro ao atualizar caso do Serviço Social')
    return NextResponse.json({ error: 'Erro ao atualizar caso do Serviço Social' }, { status: 500 })
  }
}
