import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

export async function GET() {
  const { ator, negado } = await exigir('operacao:ler')
  if (negado) return negado

  try {
    const salas = await prisma.sala.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { nome: 'asc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(salas, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar salas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('operacao:gerir')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body
    || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 120
    || !Number.isSafeInteger(body.capacidade) || Number(body.capacidade) < 1 || Number(body.capacidade) > 2_147_483_647) {
    return NextResponse.json({ error: 'Informe o nome e uma capacidade válida para a sala' }, { status: 400 })
  }
  for (const [campo, maximo] of [['tipo', 100], ['setor', 100], ['andar', 80], ['equipamentos', 500], ['obs', 2000]] as const) {
    const valor = body[campo]
    if (valor !== undefined && valor !== null && (typeof valor !== 'string' || valor.length > maximo)) {
      return NextResponse.json({ error: `Campo ${campo} inválido` }, { status: 400 })
    }
  }
  const texto = (valor: unknown) => (typeof valor === 'string' && valor.trim() ? valor.trim() : null)

  try {
    const sala = await prisma.sala.create({
      data: {
        hospitalId: ator.hospitalId,
        nome: body.nome.trim(),
        tipo: texto(body.tipo),
        setor: texto(body.setor),
        andar: texto(body.andar),
        capacidade: Number(body.capacidade),
        equipamentos: texto(body.equipamentos),
        obs: texto(body.obs),
        status: 'LIVRE',
      },
    })
    await auditar(ator, 'CRIAR', 'Sala', sala.id)
    return NextResponse.json(sala, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao cadastrar sala' }, { status: 500 })
  }
}
