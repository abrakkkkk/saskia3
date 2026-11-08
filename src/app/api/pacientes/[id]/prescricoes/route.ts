import { NextRequest, NextResponse } from 'next/server'
import { auditar, lerJson } from '@/lib/api-guard'
import { exigirPrescricao } from '@/lib/prescricao-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento, textoOpcional } from '@/lib/pacientes'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigirPrescricao('FARMACOLOGICA')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const medicamento = textoOpcional(body.medicamento, 200)
    const dose = textoOpcional(body.dose, 200)
    const via = textoOpcional(body.via, 100)
    const frequencia = textoOpcional(body.frequencia, 200)
    if (!medicamento || dose === undefined || via === undefined || frequencia === undefined) {
      return NextResponse.json({ error: 'Dados da prescrição inválidos' }, { status: 400 })
    }

    const prescricao = await prisma.$transaction(async tx => {
      const criada = await tx.prescricao.create({
        data: { pacienteId: id, medicamento, dose, via, frequencia, profissional: ator.nome, usuarioId: ator.id },
      })
      await registrarEvento(tx, ator, id, 'Prescrição', `Adicionado: ${medicamento}`)
      return criada
    })

    await auditar(ator, 'REGISTRAR_PRESCRICAO', 'Prescricao', prescricao.id, { pacienteId: id })
    return NextResponse.json(prescricao, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar prescrição:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar prescrição' }, { status: 500 })
  }
}
