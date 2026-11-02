import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento, textoOpcional } from '@/lib/pacientes'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('nutricao:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const peso = textoOpcional(body.peso, 20)
    const altura = textoOpcional(body.altura, 20)
    const dieta = textoOpcional(body.dieta, 200)
    const restricoes = textoOpcional(body.restricoes, 5000)
    if (peso === undefined || altura === undefined || dieta === undefined || restricoes === undefined) {
      return NextResponse.json({ error: 'Dados da avaliação inválidos' }, { status: 400 })
    }
    if (!peso && !altura && !dieta && !restricoes) return NextResponse.json({ error: 'Preencha a avaliação nutricional' }, { status: 400 })

    const item = await prisma.$transaction(async tx => {
      const criado = await tx.avaliacaoNutricional.create({
        data: { pacienteId: id, peso, altura, dieta, restricoes, profissional: ator.nome, usuarioId: ator.id },
      })
      await registrarEvento(tx, ator, id, 'Nutrição', 'Avaliação nutricional registrada')
      return criado
    })

    await auditar(ator, 'REGISTRAR_NUTRICAO', 'AvaliacaoNutricional', item.id, { pacienteId: id })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar nutrição:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
