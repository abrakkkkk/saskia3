import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const leitos = await prisma.utiLeito.findMany({
      where: { hospitalId },
      orderBy: { numero: 'asc' },
    })

    return NextResponse.json(leitos)
  } catch (error) {
    console.error('Erro ao buscar leitos:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body = await request.json()

    const numero = Number(body.numero)
    if (!Number.isInteger(numero) || numero < 1 || typeof body.tipo !== 'string' || !body.tipo) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    if (body.pacienteId) {
      const paciente = await prisma.paciente.findFirst({
        where: { id: body.pacienteId, hospitalId },
        select: { id: true },
      })
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const leito = await prisma.utiLeito.create({
      data: {
        hospitalId,
        numero,
        tipo: body.tipo,
        status: 'LIVRE',
        pacienteId: null,
        pacienteNome: null,
        pacienteCpf: null,
      }
    })

    return NextResponse.json(leito, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar leito:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar leito'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
