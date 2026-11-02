import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { pacienteAtivo } from '@/lib/pacientes'
import { prisma } from '@/lib/db'

// Eventos oficiais nascem no servidor, junto de cada registro clínico.
// Aqui só entra anotação livre: o tipo é fixo e o corpo não consegue imitar um evento oficial.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('evolucao:registrar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() : ''
    if (!descricao || descricao.length > 5000) return NextResponse.json({ error: 'Descrição válida é obrigatória' }, { status: 400 })

    const item = await prisma.timelineEvent.create({
      data: { pacienteId: id, tipo: 'Anotação', descricao, user: ator.nome, usuarioId: ator.id },
    })

    await auditar(ator, 'REGISTRAR_ANOTACAO', 'TimelineEvent', item.id, { pacienteId: id })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar anotação:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
