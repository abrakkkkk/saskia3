import { NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'
import { respostaErro } from '@/lib/internacao-api'

// Listas do formulário de internação: médicos ativos do hospital e leitos de UTI livres.
export async function GET() {
  try {
    const { ator, negado } = await exigir('internacao:gerir')
    if (negado) return negado
    const [medicos, leitosUti] = await Promise.all([
      prisma.usuario.findMany({
        where: { hospitalId: ator.hospitalId, cargo: 'MEDICO', ativo: true },
        orderBy: { nome: 'asc' },
        take: 300,
        select: { id: true, nome: true, especialidade: true },
      }),
      pode(ator.cargo, 'uti:gerir')
        ? prisma.utiLeito.findMany({
          where: { hospitalId: ator.hospitalId, status: 'LIVRE', pacienteId: null },
          orderBy: { numero: 'asc' },
          take: 300,
          select: { id: true, numero: true, tipo: true },
        })
        : Promise.resolve([]),
    ])
    return NextResponse.json({ medicos, leitosUti })
  } catch (error) {
    return respostaErro(error, 'carregar as opções de internação')
  }
}
