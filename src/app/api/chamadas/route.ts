import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo } from '@/lib/pacientes'

// Sem encerramento manual ainda, a chamada sai do painel sozinha depois deste prazo.
const VALIDADE_CHAMADA_MS = 2 * 60 * 60 * 1000

export async function GET() {
  try {
    const { ator, negado } = await exigir('chamada:ler')
    if (negado) return negado

    const chamadas = await prisma.chamada.findMany({
      where: { hospitalId: ator.hospitalId, status: 'ATIVA', createdAt: { gte: new Date(Date.now() - VALIDADE_CHAMADA_MS) } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, pacienteId: true, pacienteNome: true, status: true, consultorio: true, createdAt: true },
    })

    return NextResponse.json(chamadas)
  } catch (error) {
    console.error('Erro ao buscar chamadas:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar chamadas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('chamada:emitir')
    if (negado) return negado

    const body = await lerJson(request)
    const pacienteId = typeof body?.pacienteId === 'string' ? body.pacienteId : ''
    const consultorio = typeof body?.consultorio === 'string' ? body.consultorio.trim() : ''
    if (!pacienteId || !consultorio || consultorio.length > 120) {
      return NextResponse.json({ error: 'Informe o paciente e o local da chamada' }, { status: 400 })
    }

    const { paciente, bloqueio } = await pacienteAtivo(pacienteId, ator.hospitalId)
    if (bloqueio) return bloqueio

    // Clique duplo ou reenvio em poucos segundos: devolve a chamada que já existe, sem anunciar duas vezes.
    const repetida = await prisma.chamada.findFirst({
      where: { hospitalId: ator.hospitalId, pacienteId: paciente.id, consultorio, status: 'ATIVA', createdAt: { gte: new Date(Date.now() - 10_000) } },
      select: { id: true, pacienteId: true, pacienteNome: true, status: true, consultorio: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    if (repetida) return NextResponse.json(repetida, { status: 200 })

    const chamada = await prisma.chamada.create({
      data: { hospitalId: ator.hospitalId, pacienteId: paciente.id, pacienteNome: paciente.nome, consultorio, status: 'ATIVA' },
      select: { id: true, pacienteId: true, pacienteNome: true, status: true, consultorio: true, createdAt: true },
    })

    await auditar(ator, 'EMITIR_CHAMADA', 'Chamada', chamada.id, { pacienteId: paciente.id, consultorio })
    return NextResponse.json(chamada, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar chamada:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao criar chamada' }, { status: 500 })
  }
}
