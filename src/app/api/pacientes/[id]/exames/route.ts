import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pacienteAtivo, registrarEvento } from '@/lib/pacientes'

const TIPOS = ['laboratorio', 'imagem']

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('exame:solicitar')
    if (negado) return negado
    const { id } = await params
    const { bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const body = await lerJson(request)
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
    if (!body || !nome || nome.length > 160) return NextResponse.json({ error: 'Dados do exame inválidos' }, { status: 400 })
    if (body.resultado !== undefined && body.resultado !== null && body.resultado !== '') {
      return NextResponse.json({ error: 'Resultado não é informado na solicitação: use o módulo de Exames' }, { status: 400 })
    }
    const tipo = body.tipo === undefined ? 'laboratorio' : body.tipo
    if (typeof tipo !== 'string' || !TIPOS.includes(tipo)) return NextResponse.json({ error: 'Tipo de exame inválido' }, { status: 400 })

    const exame = await prisma.$transaction(async tx => {
      const criado = await tx.exame.create({
        data: { pacienteId: id, hospitalId: ator.hospitalId, tipo, nome, status: 'SOLICITADO', profissional: ator.nome, usuarioId: ator.id },
      })
      await registrarEvento(tx, ator, id, 'Exame', `Solicitado: ${nome}`)
      return criado
    })

    await auditar(ator, 'SOLICITAR_EXAME', 'Exame', exame.id, { pacienteId: id })
    return NextResponse.json(exame, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar exame:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar exame' }, { status: 500 })
  }
}
