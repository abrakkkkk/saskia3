// Valores dos indicadores de esterilização. Vazio significa "ainda não registrado".

export const INDICADOR_QUIMICO = ['Virado (OK)', 'Falho (Rejeitar)', 'Não Aplicável'] as const
export const INDICADOR_BIOLOGICO = ['Negativo (OK)', 'Positivo (Rejeitar Lote)', 'Aguardando Incubação', 'Não Aplicável'] as const
export const BOWIE_DICK = ['Aprovado', 'Reprovado (Manutenção)', 'Não Realizado', 'Não Aplicável'] as const
export const INTEGRIDADES = ['Íntegra', 'Com Manchas (Aceitável)', 'Danificada (Rejeitar)'] as const

export const ITEM_REJEITADO = 'Danificada (Rejeitar)'

const CONFORMES = new Set<string>(['Virado (OK)', 'Negativo (OK)', 'Aprovado', 'Não Aplicável'])
const REPROVADOS = new Set<string>(['Falho (Rejeitar)', 'Positivo (Rejeitar Lote)', 'Reprovado (Manutenção)'])

type Indicadores = { indicadorQuimico: string; indicadorBiologico: string; bowieDick: string }

const valores = (lote: Indicadores) => [lote.indicadorQuimico, lote.indicadorBiologico, lote.bowieDick]

export function indicadoresConformes(lote: Indicadores) {
  return valores(lote).every(valor => CONFORMES.has(valor))
}

export function indicadoresReprovados(lote: Indicadores) {
  return valores(lote).some(valor => REPROVADOS.has(valor))
}
