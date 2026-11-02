import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento, textoOpcional } from '@/lib/pacientes'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('medico:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const crm = textoOpcional(body.crm, 40)
    const especialidade = textoOpcional(body.especialidade, 120)
    const diagnostico = textoOpcional(body.diagnostico, 5000)
    const conduta = textoOpcional(body.conduta, 5000)
    if (crm === undefined || especialidade === undefined || diagnostico === undefined || conduta === undefined) {
      return NextResponse.json({ error: 'Dados da avaliação inválidos' }, { status: 400 })
    }
    if (!diagnostico && !conduta) return NextResponse.json({ error: 'Preencha o diagnóstico ou a conduta' }, { status: 400 })

    // Responsável e autor vêm da sessão. O CRM fica registrado como informado, sem valor de identificação.
    const item = await prisma.$transaction(async tx => {
      const criado = await tx.avaliacaoMedica.create({
        data: { pacienteId: id, responsavel: ator.nome, crm, especialidade, diagnostico, conduta, profissional: ator.nome, usuarioId: ator.id },
      })
      await registrarEvento(tx, ator, id, 'Avaliação Médica', 'Avaliação médica registrada')
      return criado
    })

    await auditar(ator, 'REGISTRAR_AVALIACAO_MEDICA', 'AvaliacaoMedica', item.id, { pacienteId: id })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar avaliação médica:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
