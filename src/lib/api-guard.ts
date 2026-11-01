import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { pode, type Cargo, type Permissao } from '@/lib/permissions'

export type Ator = { id: string; hospitalId: string; cargo: Cargo; nome: string }

type Resultado = { ator: Ator; negado?: never } | { ator?: never; negado: NextResponse }

/**
 * Autentica, confere o hospital da sessão e aplica a matriz de permissões.
 *
 *   const { ator, negado } = await exigir('obito:registrar')
 *   if (negado) return negado
 */
export async function exigir(permissao: Permissao = 'autenticado'): Promise<Resultado> {
  const session = await auth()
  const usuario = session?.user
  if (!usuario?.id || !usuario.hospitalId) {
    return { negado: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }
  if (!pode(usuario.cargo, permissao)) {
    return { negado: NextResponse.json({ error: 'Você não tem permissão para esta ação' }, { status: 403 }) }
  }
  return {
    ator: {
      id: usuario.id,
      hospitalId: usuario.hospitalId,
      cargo: usuario.cargo as Cargo,
      nome: usuario.name?.trim() || usuario.email || 'Usuário',
    },
  }
}

export async function lerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const corpo: unknown = await request.json()
    return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export const LIMITE_LISTA = 500

/** Trilha de auditoria (LGPD art. 37). Falha de log nunca derruba a operação clínica. */
export async function auditar(
  ator: Ator,
  acao: string,
  entidade: string,
  entidadeId: string | null,
  detalhes?: Prisma.InputJsonValue,
) {
  try {
    await prisma.auditoria.create({
      data: { hospitalId: ator.hospitalId, usuarioId: ator.id, usuarioNome: ator.nome, cargo: ator.cargo, acao, entidade, entidadeId, detalhes },
    })
  } catch (error) {
    console.error('Falha ao registrar auditoria:', acao, entidade, error instanceof Error ? error.name : 'erro')
  }
}
