import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

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
  const { ator, negado } = await exigir('operacao:ler')
  if (negado) return negado

  try {
    const reservas = await prisma.reservaSala.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { data: 'desc' },
      take: LIMITE_LISTA,
    })
    return NextResponse.json(reservas, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('operacao:abrir')
  if (negado) return negado
  const { hospitalId } = ator

  try {
    const body = await lerJson(request)
    if (!body
      || typeof body.salaId !== 'string' || !body.salaId.trim()
      || (body.paciente !== undefined && body.paciente !== null && (typeof body.paciente !== 'string' || body.paciente.length > 160))
      || typeof body.data !== 'string' || !isValidDate(body.data)
      || typeof body.horaInicio !== 'string' || !isValidTime(body.horaInicio)
      || typeof body.horaFim !== 'string' || !isValidTime(body.horaFim)
      || body.horaFim <= body.horaInicio) {
      return NextResponse.json({ error: 'Confira sala, data e horário da reserva' }, { status: 400 })
    }

    const salaId = body.salaId.trim()
    const data = body.data
    const horaInicio = body.horaInicio
    const horaFim = body.horaFim
    const paciente = typeof body.paciente === 'string' && body.paciente.trim() ? body.paciente.trim() : null
    const inicio = new Date(`${data}T${horaInicio}:00-03:00`)
    const fim = new Date(`${data}T${horaFim}:00-03:00`)
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
        where: { salaId, hospitalId, data, status: { in: ['ATIVA', 'RESERVADA'] } },
        select: { horaInicio: true, horaFim: true },
      })
      if (reservasDoDia.some(item => item.horaInicio < horaFim && item.horaFim > horaInicio)) {
        return { error: 'conflito' as const }
      }

      const alterada = await tx.sala.updateMany({
        where: { id: sala.id, hospitalId, status: sala.status },
        data: { status: statusReserva === 'ATIVA' ? 'OCUPADO' : 'RESERVADO' },
      })
      if (alterada.count === 0) return { error: 'ocupada' as const }

      return tx.reservaSala.create({
        data: {
          hospitalId,
          salaId: sala.id,
          // Autoria vem da sessão: o nome do profissional não é aceito do cliente.
          profissional: ator.nome,
          paciente,
          data,
          horaInicio,
          horaFim,
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
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Conflito de reserva simultânea. Atualize a tela e tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
  }
}
