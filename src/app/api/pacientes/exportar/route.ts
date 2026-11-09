import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'
import { filtroPacientes } from '@/lib/pacientes'
import { calcularIdade, csvCell, formatarCPF, formatarNascimento } from '@/lib/utils'

// Exportação gerada no servidor: é o único jeito de garantir permissão e trilha de auditoria.
export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('paciente:editar')
    if (negado) return negado

    const params = request.nextUrl.searchParams
    const arquivados = params.get('arquivados') === '1'
    if (arquivados && !pode(ator.cargo, 'paciente:arquivar')) {
      return NextResponse.json({ error: 'Sem permissão para exportar pacientes arquivados' }, { status: 403 })
    }

    const pacientes = await prisma.paciente.findMany({
      where: filtroPacientes(params, ator.hospitalId, { arquivados, completa: true }),
      orderBy: { nome: 'asc' },
      take: LIMITE_LISTA,
      select: { id: true, nome: true, cpf: true, nascimento: true, sexo: true, status: true, classificacao: true },
    })

    const cabecalho = ['Nome', 'CPF', 'Nascimento', 'Idade', 'Sexo', 'Status', 'Classificação'].map(csvCell).join(',')
    const linhas = pacientes.map(p => [
      p.nome, formatarCPF(p.cpf), formatarNascimento(p.nascimento),
      p.nascimento ? calcularIdade(p.nascimento) : '', p.sexo, p.status, p.classificacao,
    ].map(csvCell).join(','))

    await auditar(ator, 'EXPORTAR_PACIENTES', 'Paciente', null, {
      quantidade: pacientes.length,
      filtros: [...params.keys()],
    })

    return new NextResponse(`﻿${[cabecalho, ...linhas].join('\r\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pacientes.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Erro ao exportar pacientes:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao exportar pacientes' }, { status: 500 })
  }
}
