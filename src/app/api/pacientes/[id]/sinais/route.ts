import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento, textoOpcional } from '@/lib/pacientes'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('sinais:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const pressao = textoOpcional(body.pressao, 100)
    const fc = textoOpcional(body.fc, 100)
    const fr = textoOpcional(body.fr, 100)
    const temp = textoOpcional(body.temp, 100)
    const satO2 = textoOpcional(body.satO2, 100)
    const glicemia = textoOpcional(body.glicemia, 100)
    const valores = [pressao, fc, fr, temp, satO2, glicemia]
    if (valores.some(valor => valor === undefined)) return NextResponse.json({ error: 'Valor de sinal vital inválido' }, { status: 400 })
    if (!valores.some(Boolean)) return NextResponse.json({ error: 'Informe ao menos um sinal vital' }, { status: 400 })

    const item = await prisma.$transaction(async tx => {
      const criado = await tx.sinalVital.create({
        data: {
          pacienteId: id,
          pressao: pressao ?? null, fc: fc ?? null, fr: fr ?? null, temp: temp ?? null, satO2: satO2 ?? null, glicemia: glicemia ?? null,
          profissional: ator.nome,
          usuarioId: ator.id,
        },
      })
      await registrarEvento(tx, ator, id, 'Sinais Vitais', `PA: ${pressao ?? '-'} | FC: ${fc ?? '-'}`)
      return criado
    })

    await auditar(ator, 'REGISTRAR_SINAIS', 'SinalVital', item.id, { pacienteId: id })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar sinais vitais:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
