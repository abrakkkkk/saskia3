import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET (_: NextRequest, { params }: { params: Promise <{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const paciente = await prisma.paciente.findFirst ({
      where: { id, hospitalId, arquivadoEm: null },
      include: { 
        triagens: { orderBy: { createdAt: 'desc' } }, 
        evolucoes: { orderBy: { createdAt: 'desc' } }, 
        prescricoes: { orderBy: { createdAt: 'desc' } },
        exames: { orderBy: { createdAt: 'desc' } },
        sinaisVitais: { orderBy: { createdAt: 'desc' } },
        escoresClinicos: { orderBy: { createdAt: 'desc' } },
        avaliacoesNutri: { orderBy: { createdAt: 'desc' } },
        avaliacoesMedicas: { orderBy: { createdAt: 'desc' } },
        anotacoesEnf: { orderBy: { createdAt: 'desc' } },
        timelineEvents: { orderBy: { createdAt: 'desc' } }
      }
    })

    if (!paciente) return NextResponse.json ({ error: 'Paciente não encontrado' }, { status: 404 })

    return NextResponse.json (paciente)
  } catch {
    return NextResponse.json ({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT (request: NextRequest, { params }: { params: Promise <{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const input = body as Record<string, unknown>

    if (Object.hasOwn(input, 'arquivadoEm')) {
      if (input.arquivadoEm !== null) return NextResponse.json({ error: 'Use null para restaurar o paciente' }, { status: 400 })
      if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Apenas ADMIN pode restaurar pacientes' }, { status: 403 })
      const restaurado = await prisma.paciente.updateMany({
        where: { id, hospitalId, arquivadoEm: { not: null } },
        data: { arquivadoEm: null },
      })
      if (!restaurado.count) return NextResponse.json({ error: 'Paciente arquivado não encontrado' }, { status: 404 })
      return NextResponse.json({ success: true, arquivado: false })
    }
    
    const pacienteExistente = await prisma.paciente.findFirst({ where: { id, hospitalId, arquivadoEm: null } })
    if (!pacienteExistente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const fields = [
      'nome', 'cpf', 'rg', 'nascimento', 'sexo', 'telefone', 'email', 'endereco',
      'convenio', 'numConvenio', 'mae', 'pai', 'profissao', 'estadoCivil', 'nacionalidade',
      'naturalidade', 'religiao', 'etnia', 'tipoSanguineo', 'alergias', 'status',
      'classificacao', 'leitoTipo', 'leitoNumero', 'consultorio', 'queixaPrincipal',
    ] as const
    const safeData = Object.fromEntries(fields.filter(field => input[field] !== undefined).map(field => [field, input[field]])) as Prisma.PacienteUpdateManyMutationInput
    const nascimento = input.nascimento
    if (nascimento !== undefined && nascimento !== null) {
      if (typeof nascimento !== 'string' || Number.isNaN(new Date(nascimento).getTime())) {
        return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
      }
      safeData.nascimento = new Date(nascimento)
    }
    if (safeData.leitoNumero !== undefined && safeData.leitoNumero !== null && !Number.isInteger(Number(safeData.leitoNumero))) {
      return NextResponse.json({ error: 'Número do leito inválido' }, { status: 400 })
    }
    if (safeData.leitoNumero !== undefined && safeData.leitoNumero !== null) safeData.leitoNumero = Number(safeData.leitoNumero)
    if (Object.keys(safeData).length === 0) return NextResponse.json({ error: 'Nenhuma alteração permitida informada' }, { status: 400 })
    
    const atualizado = await prisma.paciente.updateMany({ where: { id, hospitalId, arquivadoEm: null }, data: safeData })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    const paciente = await prisma.paciente.findFirst({ where: { id, hospitalId, arquivadoEm: null } })
    return NextResponse.json (paciente)
  } catch {
    return NextResponse.json ({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE (_: NextRequest, { params }: { params: Promise <{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Apenas ADMIN pode arquivar pacientes' }, { status: 403 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    
    const pacienteExistente = await prisma.paciente.findFirst({ where: { id, hospitalId, arquivadoEm: null }, select: { id: true } })
    if (!pacienteExistente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const arquivado = await prisma.paciente.updateMany({
      where: { id, hospitalId, arquivadoEm: null },
      data: { arquivadoEm: new Date() },
    })
    if (arquivado.count === 0) return NextResponse.json({ error: 'Paciente não encontrado ou já arquivado' }, { status: 404 })
    return NextResponse.json({ success: true, arquivado: true })
  } catch {
    return NextResponse.json ({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
