import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const limits = {
  nome: 160, cpf: 20, rg: 30, sexo: 40, telefone: 40, email: 254, endereco: 300,
  convenio: 120, numConvenio: 80, mae: 160, pai: 160, profissao: 120, estadoCivil: 60,
  nacionalidade: 80, naturalidade: 120, religiao: 80, etnia: 80, tipoSanguineo: 20,
  alergias: 2000, status: 60, classificacao: 40, leitoTipo: 40, consultorio: 120,
  queixaPrincipal: 2000,
} as const

const camposTexto = Object.keys(limits) as (keyof typeof limits)[]
const statusPermitidos = new Set(['Recepção', 'Internado'])
const classificacoesPermitidas = new Set(['Azul', 'Verde', 'Amarelo', 'Vermelho'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseNascimento(value: string): Date | null {
  const datePart = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
  const dateOnly = new Date(`${datePart}T12:00:00.000Z`)
  if (Number.isNaN(dateOnly.getTime()) || dateOnly.toISOString().slice(0, 10) !== datePart) return null

  if (value.length > 10) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== new Date(value).toISOString()) return null
    return dateOnly
  }
  return dateOnly
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const archived = request.nextUrl.searchParams.get('arquivados') === '1'
    if (archived && session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas ADMIN pode consultar pacientes arquivados' }, { status: 403 })
    }

    if (request.nextUrl.searchParams.get('visao') === 'painel-chamadas') {
      const fila = await prisma.paciente.findMany({
        where: { hospitalId, arquivadoEm: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, nome: true, status: true, classificacao: true, createdAt: true },
      })
      return NextResponse.json(fila)
    }

    if (request.nextUrl.searchParams.get('visao') === 'servico-social') {
      const pacientes = await prisma.paciente.findMany({
        where: { hospitalId, arquivadoEm: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, nome: true },
      })
      return NextResponse.json(pacientes, {
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      })
    }

    const pacientes = await prisma.paciente.findMany({
      where: { hospitalId, arquivadoEm: archived ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, cpf: true, nascimento: true,
        status: true, classificacao: true, leitoTipo: true, leitoNumero: true,
        createdAt: true,
      },
    })
    return NextResponse.json(pacientes)
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
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
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    for (const field of camposTexto) {
      const value = body[field]
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > limits[field])) {
        return NextResponse.json({ error: `Campo ${field} inválido` }, { status: 400 })
      }
    }

    for (const field of ['nome', 'cpf', 'rg', 'tipoSanguineo', 'alergias'] as const) {
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        return NextResponse.json({ error: `O campo ${field} é obrigatório` }, { status: 400 })
      }
    }
    if (typeof body.email === 'string' && body.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }
    if (body.status !== undefined && (typeof body.status !== 'string' || !statusPermitidos.has(body.status))) {
      return NextResponse.json({ error: 'Status de entrada inválido' }, { status: 400 })
    }
    if (body.classificacao !== undefined && (typeof body.classificacao !== 'string' || !classificacoesPermitidas.has(body.classificacao))) {
      return NextResponse.json({ error: 'Classificação inválida' }, { status: 400 })
    }

    let nascimento: Date | undefined
    if (typeof body.nascimento !== 'string' || !body.nascimento.trim() || body.nascimento.length > 40) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
    }
    const nascimentoValidado = parseNascimento(body.nascimento)
    if (!nascimentoValidado || body.nascimento.slice(0, 10) > new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
    }
    nascimento = nascimentoValidado

    let leitoNumero: number | null | undefined
    if (body.leitoNumero !== undefined && body.leitoNumero !== null && body.leitoNumero !== '') {
      if ((typeof body.leitoNumero !== 'number' && typeof body.leitoNumero !== 'string') ||
        (typeof body.leitoNumero === 'string' && !/^\d+$/.test(body.leitoNumero))) {
        return NextResponse.json({ error: 'Número do leito inválido' }, { status: 400 })
      }
      leitoNumero = Number(body.leitoNumero)
      if (!Number.isSafeInteger(leitoNumero) || leitoNumero < 1 || leitoNumero > 2_147_483_647) {
        return NextResponse.json({ error: 'Número do leito inválido' }, { status: 400 })
      }
    }

    const data = Object.fromEntries(
      camposTexto.filter(field => body[field] !== undefined).map(field => [
        field,
        typeof body[field] === 'string' && body[field].trim() ? body[field].trim() : null,
      ]),
    ) as unknown as Prisma.PacienteUncheckedCreateInput
    if (nascimento !== undefined) data.nascimento = nascimento
    if (leitoNumero !== undefined) data.leitoNumero = leitoNumero

    const paciente = await prisma.paciente.create({ data: { ...data, hospitalId } })
    return NextResponse.json(paciente, { status: 201 })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'Já existe paciente com este CPF neste hospital' }, { status: 409 })
    }
    console.error('Erro ao criar paciente:', error)
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 })
  }
}
