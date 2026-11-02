// Regras de jornada: o estado vem do último registro do usuário, nunca do dia.
// Assim um plantão que atravessa a meia-noite continua "em jornada" e fecha normalmente.

export const TIPOS_PONTO = ['ENTRADA', 'INÍCIO INTERVALO', 'FIM INTERVALO', 'SAÍDA'] as const
export type TipoPonto = (typeof TIPOS_PONTO)[number]
export type EstadoJornada = 'FORA' | 'EM_JORNADA' | 'EM_INTERVALO'

// Variantes gravadas por versões anteriores.
const LEGADO: Record<string, TipoPonto> = {
  SAIDA: 'SAÍDA',
  'INICIO INTERVALO': 'INÍCIO INTERVALO',
  'ALMOÇO - INÍCIO': 'INÍCIO INTERVALO',
  'ALMOCO - INICIO': 'INÍCIO INTERVALO',
  'PAUSA - INÍCIO': 'INÍCIO INTERVALO',
  PAUSA_INICIO: 'INÍCIO INTERVALO',
  'ALMOÇO - RETORNO': 'FIM INTERVALO',
  'ALMOCO - RETORNO': 'FIM INTERVALO',
  'PAUSA - RETORNO': 'FIM INTERVALO',
  PAUSA_FIM: 'FIM INTERVALO',
}

export function normalizarTipo(tipo: string): TipoPonto | null {
  const maiusculo = tipo.trim().toLocaleUpperCase('pt-BR')
  if ((TIPOS_PONTO as readonly string[]).includes(maiusculo)) return maiusculo as TipoPonto
  return LEGADO[maiusculo] ?? null
}

export function estadoApos(ultimoTipo: string | null | undefined): EstadoJornada {
  const tipo = ultimoTipo ? normalizarTipo(ultimoTipo) : null
  if (tipo === 'ENTRADA' || tipo === 'FIM INTERVALO') return 'EM_JORNADA'
  if (tipo === 'INÍCIO INTERVALO') return 'EM_INTERVALO'
  return 'FORA'
}

export const PROXIMOS: Record<EstadoJornada, readonly TipoPonto[]> = {
  FORA: ['ENTRADA'],
  EM_JORNADA: ['INÍCIO INTERVALO', 'SAÍDA'],
  EM_INTERVALO: ['FIM INTERVALO'],
}

/** Minutos trabalhados: pares entrada/saída descontando intervalos. Registros em ordem crescente. */
export function minutosTrabalhados(registros: { tipo: string; timestamp: number }[], agora?: number) {
  let total = 0
  let inicio: number | null = null
  for (const r of registros) {
    const tipo = normalizarTipo(r.tipo)
    if (tipo === 'ENTRADA' || tipo === 'FIM INTERVALO') inicio = r.timestamp
    else if ((tipo === 'SAÍDA' || tipo === 'INÍCIO INTERVALO') && inicio !== null) {
      total += r.timestamp - inicio
      inicio = null
    }
  }
  if (inicio !== null && agora !== undefined) total += Math.max(0, agora - inicio)
  return Math.floor(total / 60_000)
}
