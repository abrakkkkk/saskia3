import { NextRequest, NextResponse } from 'next/server'
import { auditar, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { exigirPlataforma } from '@/lib/plataforma'
import { gerarCodigoUnidade } from '@/lib/codigo-unidade'

/**
 * Ativa ou desativa um hospital (desativado deixa de entrar). Não permite desativar o próprio hospital.
 * Com { novoCodigo: true }, troca o código da unidade usado no login (o antigo deixa de valer).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigirPlataforma()
  if (negado) return negado

  const { id } = await params
  const body = await lerJson(request)
  if (body?.novoCodigo === true) {
    try {
      let codigo = gerarCodigoUnidade()
      while (await prisma.hospital.findUnique({ where: { codigo }, select: { id: true } })) codigo = gerarCodigoUnidade()
      const atualizado = await prisma.hospital.updateMany({ where: { id }, data: { codigo } })
      if (atualizado.count === 0) return NextResponse.json({ error: 'Hospital não encontrado.' }, { status: 404 })
      await auditar(ator, 'HOSPITAL_CODIGO_TROCADO', 'Hospital', id)
      return NextResponse.json({ id, codigo })
    } catch {
      return NextResponse.json({ error: 'Não foi possível trocar o código.' }, { status: 500 })
    }
  }
  if (typeof body?.ativo !== 'boolean') return NextResponse.json({ error: 'Informe ativo: true ou false.' }, { status: 400 })
  if (id === ator.hospitalId && !body.ativo) {
    return NextResponse.json({ error: 'Você não pode desativar o hospital em que está logado.' }, { status: 409 })
  }
  try {
    const atualizado = await prisma.hospital.updateMany({ where: { id }, data: { ativo: body.ativo } })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Hospital não encontrado.' }, { status: 404 })
    await auditar(ator, body.ativo ? 'HOSPITAL_ATIVADO' : 'HOSPITAL_DESATIVADO', 'Hospital', id)
    return NextResponse.json({ id, ativo: body.ativo })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o hospital.' }, { status: 500 })
  }
}
