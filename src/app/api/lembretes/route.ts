import { NextResponse } from 'next/server'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

// "medicacao" foi retirado: o módulo não emite alertas e não pode sugerir controle de medicação.
const TIPOS = new Set(['consulta', 'exame', 'cirurgia', 'pessoal'])

function dataHoraDe(body: Record<string, unknown>) {
  const valor = body.dataHora ?? body.data
  if (typeof valor !== 'string' || !valor.trim()) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

// Lembretes são pessoais: nenhum cargo lê os de outra pessoa.
export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const lembretes = await prisma.lembrete.findMany({
      where: { hospitalId: ator.hospitalId, criadoPorId: ator.id },
      orderBy: { dataHora: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(lembretes)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar lembretes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  const dataHora = dataHoraDe(body)
  const tipo = typeof body.tipo === 'string' ? body.tipo : 'pessoal'
  const descricao = body.descricao === undefined || body.descricao === null || body.descricao === '' ? null : body.descricao
  const relacionado = body.relacionado === undefined || body.relacionado === null || body.relacionado === '' ? null : body.relacionado

  if (!titulo || titulo.length > 200 || !dataHora || !TIPOS.has(tipo)) {
    return NextResponse.json({ error: 'Título, data e tipo válidos são obrigatórios' }, { status: 400 })
  }
  if (descricao !== null && (typeof descricao !== 'string' || descricao.length > 4000)) {
    return NextResponse.json({ error: 'Descrição inválida' }, { status: 400 })
  }
  if (relacionado !== null && (typeof relacionado !== 'string' || relacionado.length > 200)) {
    return NextResponse.json({ error: 'Campo relacionado inválido' }, { status: 400 })
  }

  try {
    const lembrete = await prisma.lembrete.create({
      data: {
        hospitalId: ator.hospitalId,
        criadoPorId: ator.id,
        titulo,
        descricao,
        dataHora,
        tipo,
        relacionado,
        criadoPor: ator.nome,
        concluido: false,
        status: 'Pendente',
      },
    })
    return NextResponse.json(lembrete, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar lembrete' }, { status: 500 })
  }
}
