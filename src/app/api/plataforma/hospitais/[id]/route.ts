import { NextRequest, NextResponse } from 'next/server'
import { auditar, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { exigirPlataforma } from '@/lib/plataforma'

/** Ativa ou desativa um hospital (desativado some do login). Não permite desativar o próprio hospital. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigirPlataforma()
  if (negado) return negado

  const { id } = await params
  const body = await lerJson(request)
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
