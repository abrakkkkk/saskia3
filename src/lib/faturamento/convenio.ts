import { ehFalha, falha, texto, type Falha } from './servidor'

export const SELECT_CONVENIO = {
  id: true, nome: true, codigoAns: true, cnpj: true, codigoPrestador: true, versaoTiss: true, status: true, createdAt: true,
} as const

export type DadosConvenio = { nome?: string; codigoAns?: string; cnpj?: string | null; codigoPrestador?: string | null; status?: string }

/** Lê os campos do convênio. Na criação, nome e registro ANS são obrigatórios. */
export function lerConvenio(corpo: Record<string, unknown>, criacao: boolean): DadosConvenio | Falha {
  const nome = texto(corpo, 'nome', 120)
  const codigoAns = texto(corpo, 'codigoAns', 6, /^\d{6}$/)
  const cnpj = texto(corpo, 'cnpj', 18, /^[\d./-]{14,18}$/)
  const codigoPrestador = texto(corpo, 'codigoPrestador', 14)
  const status = texto(corpo, 'status', 7, /^(ATIVO|INATIVO)$/)
  for (const v of [nome, codigoAns, cnpj, codigoPrestador, status]) if (ehFalha(v)) return v
  if (criacao && (!nome || !codigoAns)) return falha('Informe o nome e o registro ANS (6 dígitos) do convênio')
  if (!criacao && (nome === null || codigoAns === null)) return falha('Nome e registro ANS não podem ficar vazios')
  const dados: DadosConvenio = {}
  if (typeof nome === 'string') dados.nome = nome
  if (typeof codigoAns === 'string') dados.codigoAns = codigoAns
  if (cnpj !== undefined) dados.cnpj = cnpj ? (cnpj as string).replace(/\D/g, '') : null
  if (dados.cnpj && dados.cnpj.length !== 14) return falha('CNPJ deve ter 14 dígitos')
  if (codigoPrestador !== undefined) dados.codigoPrestador = codigoPrestador as string | null
  if (typeof status === 'string') dados.status = status
  return dados
}
