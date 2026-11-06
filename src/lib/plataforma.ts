import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { exigir, type Ator } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

/**
 * Operação da plataforma (criar hospitais clientes). Não é um cargo de hospital: o ADMIN de um
 * hospital nunca pode criar ou ver outros hospitais. Só entra quem é ADMIN **e** tem o e-mail em
 * PLATAFORMA_ADMIN_EMAILS (lista separada por vírgula). Sem a variável, o recurso fica desligado.
 */
export function emailsPlataforma(): string[] {
  return (process.env.PLATAFORMA_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

type Resultado = { ator: Ator; negado?: never } | { ator?: never; negado: NextResponse }

export async function exigirPlataforma(): Promise<Resultado> {
  const guarda = await exigir('admin:acesso')
  if (guarda.negado) return guarda
  const usuario = await prisma.usuario.findFirst({
    where: { id: guarda.ator.id, hospitalId: guarda.ator.hospitalId, ativo: true },
    select: { email: true },
  })
  if (!usuario || !emailsPlataforma().includes(usuario.email.toLowerCase())) {
    return { negado: NextResponse.json({ error: 'Acesso restrito à operação da plataforma' }, { status: 403 }) }
  }
  return { ator: guarda.ator }
}

// Sem caracteres ambíguos (0/O, 1/l/I) para quem digita a senha à mão.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'

export function gerarSenhaInicial(): string {
  return Array.from(crypto.randomBytes(18), b => ALFABETO[b % ALFABETO.length]).slice(0, 16).join('')
}

/** Aceita 14 dígitos com ou sem pontuação e devolve no formato 00.000.000/0000-00; null se inválido. */
export function normalizarCnpj(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const d = valor.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return null
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
