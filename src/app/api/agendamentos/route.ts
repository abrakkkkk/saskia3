import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const agendamentos = await prisma.agendamento.findMany({
      where: { hospitalId },
      include: {
        paciente: {
          select: { nome: true, cpf: true, telefone: true }
        }
      },
      orderBy: { dataHora: 'asc' },
    })

    return NextResponse.json(agendamentos)
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
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

    if (!body.pacienteId || !body.dataHora || !body.especialidade) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Verify if Paciente belongs to the hospital
    const paciente = await prisma.paciente.findUnique({
      where: { id: body.pacienteId }
    })
    
    if (!paciente || paciente.hospitalId !== hospitalId) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        hospitalId,
        pacienteId: body.pacienteId,
        usuarioId,
        dataHora: new Date(body.dataHora),
        tipo: body.tipo || 'Consulta',
        especialidade: body.especialidade,
        profissional: body.profissional,
        sala: body.sala,
        status: 'AGENDADO',
        observacoes: body.observacoes
      },
      include: {
        paciente: true
      }
    })

    return NextResponse.json(agendamento, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar agendamento:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar agendamento'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
