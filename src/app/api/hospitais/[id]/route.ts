import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

type Contexto = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Contexto) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    if (id !== ator.hospitalId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    const hospital = await prisma.hospital.findUnique({ where: { id: ator.hospitalId } })
    if (!hospital) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json(hospital)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados do hospital' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { id } = await params
    if (id !== ator.hospitalId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome || nome.length > 160) return NextResponse.json({ error: 'Nome da instituição inválido' }, { status: 400 })
    const cnpj = typeof body.cnpj === 'string' ? body.cnpj.trim() : ''
    if (!cnpj || cnpj.length > 20) return NextResponse.json({ error: 'CNPJ da instituição inválido' }, { status: 400 })

    const opcional = (valor: unknown, max: number) => {
      if (valor === undefined || valor === null) return null
      if (typeof valor !== 'string') return undefined
      const limpo = valor.trim()
      return limpo.length <= max ? limpo || null : undefined
    }
    const endereco = opcional(body.endereco, 300)
    const telefone = opcional(body.telefone, 40)
    // O logotipo muda só por /api/hospital/logo (envio de arquivo); aqui não se aceita mais URL externa.
    if (endereco === undefined || telefone === undefined) {
      return NextResponse.json({ error: 'Dados da instituição excedem os limites permitidos' }, { status: 400 })
    }

    const hospital = await prisma.hospital.update({
      where: { id: ator.hospitalId },
      data: { nome, cnpj, endereco, telefone },
    })
    await auditar(ator, 'ATUALIZAR', 'Hospital', hospital.id)
    return NextResponse.json(hospital)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este CNPJ já está cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao salvar os dados do hospital' }, { status: 500 })
  }
}
