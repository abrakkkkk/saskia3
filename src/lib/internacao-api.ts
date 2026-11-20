import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { Falha } from '@/lib/internacao'

/** Resposta padrão das rotas de internação. */
export function respostaFalha(f: Falha) {
  return NextResponse.json({ error: f.erro }, { status: f.codigo })
}

/** Conflitos de concorrência (Serializable) e o índice único de internação aberta viram 409. */
export function respostaErro(error: unknown, contexto: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002')) {
    return NextResponse.json({ error: 'O paciente ou o leito foi atualizado em paralelo. Atualize a tela e tente novamente.' }, { status: 409 })
  }
  console.error(`Erro ao ${contexto}:`, error instanceof Error ? error.name : 'erro')
  return NextResponse.json({ error: `Erro ao ${contexto}` }, { status: 500 })
}

export const SERIALIZAVEL = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
