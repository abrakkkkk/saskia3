import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento, textoOpcional } from '@/lib/pacientes'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('enfermagem:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const coren = textoOpcional(body.coren, 40)
    const evolucao = textoOpcional(body.evolucao, 5000)
    const prescricao = textoOpcional(body.prescricao, 5000)
    if (coren === undefined || evolucao === undefined || prescricao === undefined) {
      return NextResponse.json({ error: 'Dados da anotação inválidos' }, { status: 400 })
    }
    if (!evolucao && !prescricao) return NextResponse.json({ error: 'Preencha a evolução ou a prescrição de enfermagem' }, { status: 400 })

    // Autor vem da sessão. O COREN fica registrado como informado, sem valor de identificação.
    const item = await prisma.$transaction(async tx => {
      const criado = await tx.anotacaoEnfermagem.create({
        data: { pacienteId: id, responsavel: ator.nome, coren, evolucao, prescricao, profissional: ator.nome, usuarioId: ator.id },
      })
      await registrarEvento(tx, ator, id, 'Enfermagem', 'Anotação de enfermagem registrada')
      return criado
    })

    await auditar(ator, 'REGISTRAR_ENFERMAGEM', 'AnotacaoEnfermagem', item.id, { pacienteId: id })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar enfermagem:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
