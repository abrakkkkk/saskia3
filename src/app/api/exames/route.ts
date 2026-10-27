import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const exames = await prisma.exame.findMany({
      where: { hospitalId },
      include: {
        paciente: {
          select: { nome: true, cpf: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(exames)
  } catch (error) {
    console.error('Erro ao buscar exames:', error)
    return NextResponse.json({ error: 'Erro ao buscar exames' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (!isRecord(body)
      || typeof body.pacienteId !== 'string' || !body.pacienteId.trim()
      || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 160
      || (body.tipo !== 'laboratorio' && body.tipo !== 'imagem')
      || (body.observacoes !== undefined && body.observacoes !== null
        && (typeof body.observacoes !== 'string' || body.observacoes.length > 2000))) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const pacienteId = body.pacienteId.trim()
    const paciente = await prisma.paciente.findFirst({ where: { id: pacienteId, hospitalId }, select: { id: true } })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const exame = await prisma.exame.create({
      data: {
        hospitalId,
        pacienteId,
        tipo: body.tipo.trim(),
        nome: body.nome.trim(),
        status: 'SOLICITADO',
        profissional: session.user.name || 'Médico',
        observacoes: typeof body.observacoes === 'string' && body.observacoes.trim()
          ? body.observacoes.trim()
          : null
      },
      include: {
        paciente: true
      }
    })

    return NextResponse.json(exame, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar exame:', error)
    return NextResponse.json({ error: 'Erro ao criar exame' }, { status: 500 })
  }
}
