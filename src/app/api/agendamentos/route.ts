import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const usuarioId = session.user.id
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const input = body as Record<string, unknown>

    if (typeof input.pacienteId !== 'string' || !input.pacienteId || typeof input.dataHora !== 'string' || typeof input.especialidade !== 'string' || !input.especialidade.trim()) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Verify if Paciente belongs to the hospital
    const paciente = await prisma.paciente.findFirst({
      where: { id: input.pacienteId, hospitalId },
      select: { id: true },
    })
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const dataHora = new Date(input.dataHora)
    if (Number.isNaN(dataHora.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    const optionalText = (key: string, max: number) => {
      const value = input[key]
      return value == null ? undefined : typeof value === 'string' && value.length <= max ? value.trim() : null
    }
    const tipo = optionalText('tipo', 80)
    const profissional = optionalText('profissional', 120)
    const sala = optionalText('sala', 80)
    const observacoes = optionalText('observacoes', 1000)
    if ([tipo, profissional, sala, observacoes].includes(null)) {
      return NextResponse.json({ error: 'Um ou mais campos excedem o formato permitido' }, { status: 400 })
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        hospitalId,
        pacienteId: input.pacienteId,
        usuarioId,
        dataHora,
        tipo: tipo || 'Consulta',
        especialidade: input.especialidade.trim().slice(0, 100),
        profissional,
        sala,
        status: 'AGENDADO',
        observacoes
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
