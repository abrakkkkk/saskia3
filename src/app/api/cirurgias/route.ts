import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const cirurgias = await prisma.cirurgia.findMany({
      where: { hospitalId },
      include: {
        paciente: {
          select: { nome: true, cpf: true }
        }
      },
      orderBy: { dataHora: 'asc' },
    })

    return NextResponse.json(cirurgias)
  } catch (error) {
    console.error('Erro ao buscar cirurgias:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const usuarioId = session.user.id
    const body = await request.json()

    if (!body.pacienteId || !body.procedimento || !body.dataHora) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Verify if Paciente belongs to the hospital
    const paciente = await prisma.paciente.findUnique({
      where: { id: body.pacienteId }
    })
    
    if (!paciente || paciente.hospitalId !== hospitalId) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const cirurgia = await prisma.cirurgia.create({
      data: {
        hospitalId,
        pacienteId: body.pacienteId,
        usuarioId,
        procedimento: body.procedimento,
        sala: body.sala || 'A Definir',
        dataHora: new Date(body.dataHora),
        equipe: body.equipe || 'Equipe Plantão',
        anestesia: body.anestesia || 'Geral',
        status: 'AGENDADA',
        observacoes: body.observacoes || null
      },
      include: {
        paciente: true
      }
    })

    return NextResponse.json(cirurgia, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar cirurgia:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar cirurgia'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
