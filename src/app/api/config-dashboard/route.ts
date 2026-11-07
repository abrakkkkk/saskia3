import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { isBooleanRecord } from '@/lib/request-validation'

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const config = await prisma.configDashboard.findUnique({ where: { hospitalId: ator.hospitalId } })
    return NextResponse.json(config ? config.config : {})
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar configuração do dashboard' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const bruto = await lerJson(request)
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto) || Object.keys(bruto).length > 100) {
    return NextResponse.json({ error: 'Configuração inválida' }, { status: 400 })
  }
  // Configurações antigas (tema, widgetsAtivos...) não são interruptores: descartadas em vez de recusar tudo.
  const body = Object.fromEntries(Object.entries(bruto).filter(([, v]) => typeof v === 'boolean'))
  if (!isBooleanRecord(body)) return NextResponse.json({ error: 'Configuração inválida' }, { status: 400 })

  try {
    const config = await prisma.configDashboard.upsert({
      where: { hospitalId: ator.hospitalId },
      update: { config: body },
      create: { hospitalId: ator.hospitalId, config: body },
    })
    await auditar(ator, 'ATUALIZAR', 'ConfigDashboard', config.id)
    return NextResponse.json(config.config)
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar configuração do dashboard' }, { status: 500 })
  }
}
