import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type StatusExame } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { isTerminal } from '@/lib/paciente-status'

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 100
const PRIORIDADES = new Set(['Normal', 'Urgente', 'Emergência'])
// A ficha do paciente grava 'Laboratorial'; a tela de exames, 'laboratorio'.
const TIPOS: Record<string, string[]> = {
  laboratorio: ['laboratorio', 'Laboratorial', 'laboratorial'],
  imagem: ['imagem', 'Imagem', 'imagens'],
}
const STATUS_VALIDOS = new Set(['SOLICITADO', 'AGENDADO', 'COLETADO', 'EM_ANALISE', 'CONCLUIDO', 'ALTERADO_CRITICO', 'CANCELADO'])
const STATUS_ABERTOS: StatusExame[] = ['SOLICITADO', 'AGENDADO', 'COLETADO', 'EM_ANALISE']
const STATUS_AGUARDANDO_LAUDO: StatusExame[] = ['COLETADO', 'EM_ANALISE']

const SELECT_EXAME = {
  id: true, tipo: true, nome: true, status: true, resultado: true, observacoes: true,
  prioridade: true, indicacao: true, profissional: true, liberadoEm: true,
  createdAt: true, updatedAt: true, pacienteId: true,
  paciente: { select: { nome: true, nascimento: true } },
  solicitante: { select: { nome: true } },
  liberadoPor: { select: { nome: true } },
} satisfies Prisma.ExameSelect

function inteiroPositivo(valor: string | null, padrao: number) {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero > 0 ? numero : padrao
}

export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('exame:ler')
    if (negado) return negado

    const parametros = request.nextUrl.searchParams
    const pagina = inteiroPositivo(parametros.get('pagina'), 1)
    const limite = Math.min(inteiroPositivo(parametros.get('limite'), LIMITE_PADRAO), LIMITE_MAXIMO)
    const tipo = parametros.get('tipo')
    const status = parametros.get('status')
    const busca = parametros.get('busca')?.trim().slice(0, 120)
    const fila = parametros.get('fila')

    const base = { hospitalId: ator.hospitalId }
    const where: Prisma.ExameWhereInput = {
      ...base,
      ...(tipo && TIPOS[tipo] ? { tipo: { in: TIPOS[tipo] } } : {}),
      ...(status && STATUS_VALIDOS.has(status) ? { status: status as StatusExame } : {}),
      ...(fila === 'laudo' ? { status: { in: STATUS_AGUARDANDO_LAUDO } } : {}),
      ...(busca ? {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          { paciente: { nome: { contains: busca, mode: 'insensitive' } } },
        ],
      } : {}),
    }
    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const [itens, total, laboratorio, imagem, pendentes, concluidosHoje, criticos, ultimosCriticos] = await Promise.all([
      prisma.exame.findMany({
        where,
        select: SELECT_EXAME,
        orderBy: { createdAt: fila === 'laudo' ? 'asc' : 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.exame.count({ where }),
      prisma.exame.count({ where: { ...base, tipo: { in: TIPOS.laboratorio } } }),
      prisma.exame.count({ where: { ...base, tipo: { in: TIPOS.imagem } } }),
      prisma.exame.count({ where: { ...base, status: { in: STATUS_ABERTOS } } }),
      prisma.exame.count({ where: { ...base, status: 'CONCLUIDO', liberadoEm: { gte: inicioHoje } } }),
      prisma.exame.count({ where: { ...base, status: 'ALTERADO_CRITICO' } }),
      prisma.exame.findMany({
        where: { ...base, status: 'ALTERADO_CRITICO' },
        select: SELECT_EXAME,
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      itens,
      total,
      pagina,
      limite,
      contadores: { laboratorio, imagem, pendentes, concluidosHoje, criticos },
      ultimosCriticos,
    })
  } catch (error) {
    console.error('Erro ao buscar exames:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar exames' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('exame:solicitar')
    if (negado) return negado

    const body = await lerJson(request)
    if (!body
      || typeof body.pacienteId !== 'string' || !body.pacienteId.trim()
      || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 160
      || (body.tipo !== 'laboratorio' && body.tipo !== 'imagem')
      || (body.prioridade !== undefined && (typeof body.prioridade !== 'string' || !PRIORIDADES.has(body.prioridade)))
      || (body.indicacao !== undefined && body.indicacao !== null
        && (typeof body.indicacao !== 'string' || body.indicacao.length > 2000))) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const pacienteId = body.pacienteId.trim()
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, hospitalId: ator.hospitalId, arquivadoEm: null },
      select: { status: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    if (isTerminal(paciente.status)) return NextResponse.json({ error: 'Paciente com óbito registrado não pode receber solicitação' }, { status: 409 })

    const exame = await prisma.exame.create({
      data: {
        hospitalId: ator.hospitalId,
        pacienteId,
        tipo: body.tipo,
        nome: body.nome.trim(),
        status: 'SOLICITADO',
        usuarioId: ator.id,
        profissional: ator.nome,
        prioridade: typeof body.prioridade === 'string' ? body.prioridade : 'Normal',
        indicacao: typeof body.indicacao === 'string' && body.indicacao.trim() ? body.indicacao.trim() : null,
      },
      select: SELECT_EXAME,
    })

    await auditar(ator, 'EXAME_SOLICITADO', 'Exame', exame.id, { pacienteId, nome: exame.nome, prioridade: exame.prioridade })
    return NextResponse.json(exame, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar exame:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao criar exame' }, { status: 500 })
  }
}
