import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ([], { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const archived = request.nextUrl.searchParams.get('arquivados') === '1'
    if (archived && session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Apenas ADMIN pode consultar pacientes arquivados' }, { status: 403 })
    const pacientes = await prisma.paciente.findMany ({
      where: { hospitalId, arquivadoEm: archived ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, cpf: true, nascimento: true,
        status: true, classificacao: true, leitoTipo: true, leitoNumero: true,
        createdAt: true,
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
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const input = body as Record<string, unknown>

    const { nome, cpf, rg, tipoSanguineo, alergias } = input
    if ([nome, cpf, rg, tipoSanguineo, alergias].some(value => typeof value !== 'string' || !value.trim())) {
      return NextResponse.json(
        { error: 'Os campos Nome, CPF, RG, Tipo Sanguíneo e Alergias são obrigatórios.' },
        { status: 400 }
      );
    }

    const fields = [
      'nome', 'cpf', 'rg', 'nascimento', 'sexo', 'telefone', 'email', 'endereco',
      'convenio', 'numConvenio', 'mae', 'pai', 'profissao', 'estadoCivil', 'nacionalidade',
      'naturalidade', 'religiao', 'etnia', 'tipoSanguineo', 'alergias', 'status',
      'classificacao', 'leitoTipo', 'leitoNumero', 'consultorio', 'queixaPrincipal',
    ] as const
    const data = Object.fromEntries(fields.filter(field => input[field] !== undefined).map(field => [field, input[field]])) as Prisma.PacienteUncheckedCreateInput
    if (data.nascimento && Number.isNaN(new Date(data.nascimento).getTime())) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
    }
    if (data.leitoNumero !== undefined && data.leitoNumero !== null && !Number.isInteger(Number(data.leitoNumero))) {
      return NextResponse.json({ error: 'Número do leito inválido' }, { status: 400 })
    }
    if (data.leitoNumero !== undefined && data.leitoNumero !== null) data.leitoNumero = Number(data.leitoNumero)

    const paciente = await prisma.paciente.create ({
      data: { ...data, hospitalId }
    })

    return NextResponse.json (paciente, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar paciente'
    return NextResponse.json ({ error: message }, { status: 500 })
  }
}
