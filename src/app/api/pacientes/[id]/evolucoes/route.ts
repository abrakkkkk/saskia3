import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento } from '@/lib/pacientes'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('evolucao:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() : ''
    if (!descricao || descricao.length > 5000) {
      return NextResponse.json({ error: 'Descrição da evolução é obrigatória' }, { status: 400 })
    }

    const tipo = ator.cargo === 'MEDICO' ? 'Evolução Médica' : 'Evolução de Enfermagem'
    const evolucao = await prisma.$transaction(async tx => {
      const criada = await tx.evolucao.create({
        data: { pacienteId: id, tipo, descricao, profissional: ator.nome, usuarioId: ator.id },
      })
      await registrarEvento(tx, ator, id, 'Evolução', `${tipo} registrada`)
      return criada
    })

    await auditar(ator, 'REGISTRAR_EVOLUCAO', 'Evolucao', evolucao.id, { pacienteId: id })
    return NextResponse.json(evolucao, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar evolução:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar evolução' }, { status: 500 })
  }
}
