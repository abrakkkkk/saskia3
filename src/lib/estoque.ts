// Regras puras de estoque, usadas pelas APIs e pelas telas. Sem acesso a banco.

export type CategoriaEstoque = 'FARMACIA' | 'ALMOXARIFADO'

// O seed e dados antigos usam 'Medicamentos' e 'Materiais'; as telas usam os nomes oficiais.
export const CATEGORIAS_EQUIVALENTES: Record<CategoriaEstoque, string[]> = {
  FARMACIA: ['FARMACIA', 'Medicamentos', 'Medicamento'],
  ALMOXARIFADO: ['ALMOXARIFADO', 'Materiais', 'Material'],
}

export function normalizarCategoria(valor: unknown): CategoriaEstoque | null {
  if (typeof valor !== 'string') return null
  if (CATEGORIAS_EQUIVALENTES.FARMACIA.includes(valor)) return 'FARMACIA'
  if (CATEGORIAS_EQUIVALENTES.ALMOXARIFADO.includes(valor)) return 'ALMOXARIFADO'
  return null
}

export function ehMedicamento(categoria: string) {
  return normalizarCategoria(categoria) === 'FARMACIA'
}

export const DIAS_ALERTA_VALIDADE = 30

function chaveDia(data: Date | string) {
  return (typeof data === 'string' ? new Date(data) : data).toISOString().slice(0, 10)
}

/** A validade vale até o fim do dia informado. */
export function estaVencido(validade: Date | string | null | undefined, agora = new Date()) {
  return !!validade && chaveDia(validade) < chaveDia(agora)
}

export function venceEmBreve(validade: Date | string | null | undefined, agora = new Date()) {
  if (!validade || estaVencido(validade, agora)) return false
  const limite = new Date(agora.getTime() + DIAS_ALERTA_VALIDADE * 24 * 60 * 60 * 1000)
  return chaveDia(validade) <= chaveDia(limite)
}

/** Início do dia corrente em UTC: abaixo disso o item está vencido. */
export function inicioDoDiaUtc(agora = new Date()) {
  return new Date(`${chaveDia(agora)}T00:00:00.000Z`)
}

export function formatarValidade(validade: Date | string | null | undefined) {
  if (!validade) return 'sem validade'
  const [ano, mes, dia] = chaveDia(validade).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Datas de <input type="date"> ou ISO. Devolve null quando inválida. */
export function lerValidade(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export function normalizarLote(valor: unknown) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}
