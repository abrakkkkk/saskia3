import { NextResponse } from 'next/server'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function GET() {
  const { ator, negado } = await exigir('operacao:ler')
  if (negado) return negado

  try {
    const transportes = await prisma.transportePaciente.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(transportes)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar transportes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('operacao:abrir')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { pacienteId, origem, destino, tipo, data } = body
  const campoValido = (valor: unknown): valor is string => typeof valor === 'string' && !!valor.trim() && valor.length <= 200
  if (typeof pacienteId !== 'string' || !pacienteId.trim() || pacienteId.length > 64
    || !campoValido(origem) || !campoValido(destino) || !campoValido(tipo) || !campoValido(data)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data) || Number.isNaN(new Date(`${data}:00-03:00`).getTime())) {
    return NextResponse.json({ error: 'Preencha os dados obrigatórios do transporte' }, { status: 400 })
  }
  if (origem.trim() === destino.trim()) {
    return NextResponse.json({ error: 'Origem e destino precisam ser diferentes' }, { status: 400 })
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId.trim(), hospitalId: ator.hospitalId, arquivadoEm: null },
      select: { nome: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 })

    const transporte = await prisma.transportePaciente.create({
      data: {
        hospitalId: ator.hospitalId,
        paciente: paciente.nome,
        origem: origem.trim(),
        destino: destino.trim(),
        tipo: tipo.trim(),
        solicitante: ator.nome,
        data,
        status: 'Pendente',
      },
    })
    return NextResponse.json(transporte, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar transporte' }, { status: 500 })
  }
}
