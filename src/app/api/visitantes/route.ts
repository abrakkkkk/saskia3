import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { textoOpcional } from '@/lib/pacientes'

export async function GET() {
  try {
    const { ator, negado } = await exigir('recepcao:operar')
    if (negado) return negado

    const visitantes = await prisma.visitante.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { entrada: 'desc' },
      take: LIMITE_LISTA,
      include: { paciente: { select: { nome: true } } },
    })

    return NextResponse.json(visitantes)
  } catch (error) {
    console.error('Erro ao buscar visitantes:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar visitantes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('recepcao:operar')
    if (negado) return negado

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const nome = textoOpcional(body.nome, 160)
    const documento = textoOpcional(body.documento, 40)
    const destino = textoOpcional(body.destino, 160)
    const pacienteId = body.pacienteId
    if (!nome || documento === undefined || destino === undefined || (pacienteId != null && (typeof pacienteId !== 'string' || !pacienteId))) {
      return NextResponse.json({ error: 'Dados do visitante inválidos' }, { status: 400 })
    }

    if (typeof pacienteId === 'string') {
      const paciente = await prisma.paciente.findFirst({
        where: { id: pacienteId, hospitalId: ator.hospitalId, arquivadoEm: null },
        select: { id: true },
      })
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 })
    }

    const visitante = await prisma.visitante.create({
      data: {
        hospitalId: ator.hospitalId,
        nome,
        documento,
        destino,
        pacienteId: typeof pacienteId === 'string' ? pacienteId : null,
        status: 'DENTRO',
      },
    })

    await auditar(ator, 'REGISTRAR_VISITANTE', 'Visitante', visitante.id)
    return NextResponse.json(visitante, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar visitante:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar visitante' }, { status: 500 })
  }
}
