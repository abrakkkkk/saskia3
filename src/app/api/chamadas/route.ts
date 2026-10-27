import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const chamadas = await prisma.chamada.findMany({
      where: { hospitalId, status: 'ATIVA' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, pacienteId: true, pacienteNome: true, status: true, consultorio: true, createdAt: true },
    })

    return NextResponse.json(chamadas)
  } catch (error) {
    console.error('Erro ao buscar chamadas:', error)
    return NextResponse.json({ error: 'Erro ao buscar chamadas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    if (!body.pacienteId || !body.consultorio) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const paciente = await prisma.paciente.findFirst({
      where: { id: body.pacienteId, hospitalId },
      select: { id: true, nome: true, cpf: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const chamada = await prisma.chamada.create({
      data: {
        hospitalId,
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        cpf: paciente.cpf,
        consultorio: body.consultorio,
        status: 'ATIVA'
      }
    })

    return NextResponse.json(chamada, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar chamada'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
