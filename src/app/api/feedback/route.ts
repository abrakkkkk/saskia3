import { NextResponse } from 'next/server'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'

const TIPOS_FEEDBACK = new Set(['SUGESTAO', 'ELOGIO', 'RECLAMACAO', 'BUG'])
const INCLUIR = { usuario: { select: { id: true, nome: true } } } as const

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const data = await prisma.feedback.findMany({
      where: { hospitalId: ator.hospitalId, ...(pode(ator.cargo, 'admin:acesso') ? {} : { usuarioId: ator.id }) },
      include: INCLUIR,
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar feedbacks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body || typeof body.mensagem !== 'string' || !body.mensagem.trim() || body.mensagem.length > 4000
    || (body.tipo !== undefined && (typeof body.tipo !== 'string' || !TIPOS_FEEDBACK.has(body.tipo)))) {
    return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
  }
  // Impede imitar uma resposta da equipe: o marcador só é gravado pelo PATCH.
  if (body.mensagem.includes('[RESPOSTA DA EQUIPE]')) {
    return NextResponse.json({ error: 'A mensagem contém um texto reservado' }, { status: 400 })
  }

  try {
    const data = await prisma.feedback.create({
      data: {
        hospitalId: ator.hospitalId,
        usuarioId: ator.id,
        tipo: typeof body.tipo === 'string' ? body.tipo : 'SUGESTAO',
        mensagem: body.mensagem.trim(),
        status: 'NOVO',
      },
      include: INCLUIR,
    })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar feedback' }, { status: 500 })
  }
}
