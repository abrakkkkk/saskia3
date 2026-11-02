import { NextRequest, NextResponse } from 'next/server'
import { exigir, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'
import { filtroPacientes } from '@/lib/pacientes'

// Busca avançada: contato e identificação só para quem atende ou cadastra o paciente.
export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('paciente:listar')
    if (negado) return negado

    const completa = pode(ator.cargo, 'paciente:cadastrar') || pode(ator.cargo, 'prontuario:ler')
    const where = filtroPacientes(request.nextUrl.searchParams, ator.hospitalId, { arquivados: false, completa })

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: LIMITE_LISTA,
        select: {
          id: true,
          nome: true,
          nascimento: true,
          status: true,
          classificacao: true,
          ...(completa ? { cpf: true, sexo: true, telefone: true, endereco: true, mae: true } : {}),
        },
      }),
      prisma.paciente.count({ where }),
    ])

    return NextResponse.json(pacientes, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Total-Count': String(total) },
    })
  } catch (error) {
    console.error('Erro na busca avançada de pacientes:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
  }
}
