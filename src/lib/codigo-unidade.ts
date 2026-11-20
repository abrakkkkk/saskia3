import crypto from 'node:crypto'

// Sem caracteres ambíguos (0/O, 1/I/L), igual ao preenchimento da migração.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const FORMATO = /^[A-Z0-9]{4,12}$/

/** Gera um código de 6 caracteres para o login da unidade. */
export function gerarCodigoUnidade(): string {
  return Array.from(crypto.randomBytes(6), b => ALFABETO[b % ALFABETO.length]).join('')
}

/** Normaliza o que a pessoa digitou (maiúsculas, sem espaço ou hífen); null se o formato não serve. */
export function normalizarCodigoUnidade(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.replace(/[\s-]/g, '').toUpperCase()
  return FORMATO.test(limpo) ? limpo : null
}
