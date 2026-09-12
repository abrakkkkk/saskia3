import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ([], { status: 401 })

    const hospitalId = session.user.hospitalId
    const pacientes = await prisma.paciente.findMany ({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, cpf: true, nascimento: true,
        status: true, classificacao: true, leitoTipo: true, leitoNumero: true,
      },
    })

    return NextResponse.json (pacientes)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST (request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()

    const { nome, cpf, rg, tipoSanguineo, alergias } = body;
    if (!nome || !cpf || !rg || !tipoSanguineo || !alergias) {
      return NextResponse.json(
        { error: 'Os campos Nome, CPF, RG, Tipo Sanguíneo e Alergias são obrigatórios.' },
        { status: 400 }
      );
    }

    const paciente = await prisma.paciente.create ({
      data: { ...body, hospitalId }
    })

    return NextResponse.json (paciente, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar paciente'
    return NextResponse.json ({ error: message }, { status: 500 })
  }
}
