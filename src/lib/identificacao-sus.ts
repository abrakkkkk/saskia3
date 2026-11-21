import { cpfValido, normalizarCpf } from './utils'
import { cboValido, cnsValido, somenteDigitos } from './cns'

export type IdentificacaoSus = { cns: string | null; cpf: string | null; cbo: string | null }

/**
 * Lê CNS, CPF e CBO de um corpo de requisição (só os campos presentes, para PUT parcial).
 * Vazio grava null; valor presente precisa ser válido. Nunca ecoa o número na mensagem de erro.
 */
export function lerIdentificacaoSus(
  body: Record<string, unknown>,
  campos: readonly (keyof IdentificacaoSus)[] = ['cns', 'cpf', 'cbo'],
): { data: Partial<IdentificacaoSus> } | { error: string } {
  const data: Partial<IdentificacaoSus> = {}
  for (const campo of campos) {
    if (!(campo in body)) continue
    const bruto = body[campo]
    if (bruto !== null && bruto !== undefined && typeof bruto !== 'string') return { error: `Campo ${campo.toUpperCase()} inválido` }
    const valor = campo === 'cpf' ? normalizarCpf(bruto as string | null) : somenteDigitos(bruto)
    if (!valor) { data[campo] = null; continue }
    if (campo === 'cns' && !cnsValido(valor)) return { error: 'CNS inválido: confira os 15 dígitos do Cartão Nacional de Saúde' }
    if (campo === 'cpf' && !cpfValido(valor)) return { error: 'CPF inválido' }
    if (campo === 'cbo' && !cboValido(valor)) return { error: 'CBO inválido: use os 6 dígitos da Classificação Brasileira de Ocupações' }
    data[campo] = valor
  }
  return { data }
}
