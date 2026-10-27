import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

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

async function sessaoHospital() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  const hospitalId = session.user.hospitalId
  if (!hospitalId) return { error: NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 }) }
  return { session, hospitalId }
}

export async function GET() {
  try {
    const acesso = await sessaoHospital()
    if ('error' in acesso) return acesso.error

    const casos = await prisma.casoSocial.findMany({
      where: { hospitalId: acesso.hospitalId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(casos)
  } catch (error) {
    console.error('Erro ao buscar casos do Serviço Social:', error)
    return NextResponse.json({ error: 'Erro ao buscar casos do Serviço Social' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const acesso = await sessaoHospital()
    if ('error' in acesso) return acesso.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const camposPermitidos = ['pacienteId', 'situacao', 'tipo', 'status', 'data', 'relato', 'encaminhamentos']
    if (!isRecord(body)
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
      where: { id: body.pacienteId.trim(), hospitalId: acesso.hospitalId, arquivadoEm: null },
      select: { id: true, nome: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 })

    const detalhe = [
      `Tipo de atendimento: ${body.tipo}`,
      `Profissional: ${acesso.session.user.name || 'Profissional'}`,
      `Data do atendimento: ${body.data}`,
      `Relato / evolução: ${body.relato.trim()}`,
      typeof body.encaminhamentos === 'string' && body.encaminhamentos.trim()
        ? `Encaminhamentos: ${body.encaminhamentos.trim()}`
        : '',
    ].filter(Boolean).join('\n')

    const caso = await prisma.casoSocial.create({
      data: {
        hospitalId: acesso.hospitalId,
        pacienteNome: paciente.nome,
        situacao: body.situacao,
        detalhe,
        status: body.status,
      },
    })
    return NextResponse.json(caso, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar atendimento social:', error)
    return NextResponse.json({ error: 'Erro ao registrar atendimento social' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const acesso = await sessaoHospital()
    if ('error' in acesso) return acesso.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body)
      || Object.keys(body).some(campo => !['id', 'status', 'detalhe'].includes(campo))
      || typeof body.id !== 'string' || !body.id.trim()
      || (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status)))
      || (body.detalhe !== undefined && (typeof body.detalhe !== 'string' || body.detalhe.length > 6000))
      || (body.status === undefined && body.detalhe === undefined)) {
      return NextResponse.json({ error: 'Dados de atualização inválidos' }, { status: 400 })
    }

    const caso = await prisma.casoSocial.findFirst({
      where: { id: body.id.trim(), hospitalId: acesso.hospitalId },
      select: { id: true },
    })
    if (!caso) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

    const atualizado = await prisma.casoSocial.updateMany({
      where: { id: caso.id, hospitalId: acesso.hospitalId },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.detalhe !== undefined ? { detalhe: body.detalhe } : {}),
      },
    })
    if (!atualizado.count) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })
    return NextResponse.json(await prisma.casoSocial.findFirst({ where: { id: caso.id, hospitalId: acesso.hospitalId } }))
  } catch (error) {
    console.error('Erro ao atualizar caso do Serviço Social:', error)
    return NextResponse.json({ error: 'Erro ao atualizar caso do Serviço Social' }, { status: 500 })
  }
}
