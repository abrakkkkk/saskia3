import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { ehModeloClinico } from '@/lib/modelos-clinicos'
import { situacaoTodos } from '@/lib/modelos-clinicos-servidor'

// Item 10: validação dos modelos clínicos oficiais pelo hospital (ADMIN).
export async function GET() {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado
  try {
    return NextResponse.json(await situacaoTodos(ator.hospitalId))
  } catch {
    console.error('Erro ao ler validação de modelos clínicos')
    return NextResponse.json({ error: 'Erro ao carregar os modelos clínicos' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado
  const body = await lerJson(request)
  if (!body || !ehModeloClinico(body.modelo) || typeof body.validado !== 'boolean') {
    return NextResponse.json({ error: 'Informe o modelo e se está validado' }, { status: 400 })
  }
  const modelo = body.modelo
  const observacao = typeof body.observacao === 'string' && body.observacao.trim() ? body.observacao.trim().slice(0, 500) : null
  try {
    if (body.validado) {
      await prisma.validacaoModeloClinico.upsert({
        where: { hospitalId_modelo: { hospitalId: ator.hospitalId, modelo } },
        create: { hospitalId: ator.hospitalId, modelo, validadoPorId: ator.id, validadoPorNome: ator.nome, observacao },
        update: { validadoEm: new Date(), validadoPorId: ator.id, validadoPorNome: ator.nome, observacao },
      })
    } else {
      await prisma.validacaoModeloClinico.deleteMany({ where: { hospitalId: ator.hospitalId, modelo } })
    }
    await auditar(ator, body.validado ? 'modelo_clinico.validar' : 'modelo_clinico.revogar', 'ValidacaoModeloClinico', modelo, { observacao })
    return NextResponse.json(await situacaoTodos(ator.hospitalId))
  } catch {
    console.error('Erro ao salvar validação de modelo clínico')
    return NextResponse.json({ error: 'Erro ao salvar a validação' }, { status: 500 })
  }
}
