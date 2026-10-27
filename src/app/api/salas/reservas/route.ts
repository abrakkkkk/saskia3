import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const reservas = await prisma.reservaSala.findMany({
      where: { hospitalId },
      orderBy: { data: 'desc' },
    })

    return NextResponse.json(reservas)
  } catch (error) {
    console.error('Erro ao buscar reservas de sala:', error)
    return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
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
      || typeof body.salaId !== 'string' || !body.salaId.trim()
      || typeof body.profissional !== 'string' || !body.profissional.trim() || body.profissional.length > 160
      || (body.paciente !== undefined && body.paciente !== null
        && (typeof body.paciente !== 'string' || body.paciente.length > 160))
      || typeof body.data !== 'string' || !isValidDate(body.data)
      || typeof body.horaInicio !== 'string' || !isValidTime(body.horaInicio)
      || typeof body.horaFim !== 'string' || !isValidTime(body.horaFim)
      || body.horaFim <= body.horaInicio) {
      return NextResponse.json({ error: 'Confira sala, profissional, data e horário da reserva' }, { status: 400 })
    }

    const salaId = body.salaId.trim()
    const profissional = body.profissional.trim()
    const paciente = typeof body.paciente === 'string' && body.paciente.trim() ? body.paciente.trim() : null
    const inicio = new Date(`${body.data}T${body.horaInicio}:00`)
    const fim = new Date(`${body.data}T${body.horaFim}:00`)
    const agora = new Date()
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= agora) {
      return NextResponse.json({ error: 'A reserva precisa terminar em um horário futuro' }, { status: 400 })
    }
    const statusReserva = inicio <= agora ? 'ATIVA' : 'RESERVADA'

    const reserva = await prisma.$transaction(async tx => {
      const sala = await tx.sala.findFirst({
        where: { id: salaId, hospitalId, status: { in: ['LIVRE', 'RESERVADO'] } },
        select: { id: true, status: true },
      })
      if (!sala) return { error: 'sala' as const }

      const reservasDoDia = await tx.reservaSala.findMany({
        where: { salaId, hospitalId, data: body.data as string, status: { in: ['ATIVA', 'RESERVADA'] } },
        select: { horaInicio: true, horaFim: true },
      })
      const conflito = reservasDoDia.some(item => (
        item.horaInicio < (body.horaFim as string) && item.horaFim > (body.horaInicio as string)
      ))
      if (conflito) return { error: 'conflito' as const }

      const changed = await tx.sala.updateMany({
        where: { id: sala.id, hospitalId, status: sala.status },
        data: {
          status: statusReserva === 'ATIVA'
            ? 'OCUPADO'
            : sala.status === 'OCUPADO' ? 'OCUPADO' : 'RESERVADO',
        },
      })
      if (changed.count === 0) return { error: 'ocupada' as const }

      return tx.reservaSala.create({
        data: {
          hospitalId,
          salaId: sala.id,
          profissional,
          paciente,
          data: body.data as string,
          horaInicio: body.horaInicio as string,
          horaFim: body.horaFim as string,
          status: statusReserva,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if ('error' in reserva) {
      if (reserva.error === 'sala') return NextResponse.json({ error: 'Sala não encontrada ou indisponível' }, { status: 404 })
      if (reserva.error === 'conflito') return NextResponse.json({ error: 'Já existe uma reserva nesse horário' }, { status: 409 })
      return NextResponse.json({ error: 'A sala acabou de ser reservada. Atualize a tela.' }, { status: 409 })
    }

    return NextResponse.json(reserva, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar reserva de sala:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Conflito de reserva simultânea. Atualize a tela e tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
  }
}
