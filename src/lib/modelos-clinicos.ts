// Modelos clínicos liberados com base oficial (decisão do dono, 21/11/2026). Cada hospital valida na implantação;
// até lá as telas mostram "Modelo padrão MS/Anvisa". Sem dependência de servidor.

export const MODELOS_CLINICOS = {
  CHECKLIST_CIRURGICO: {
    nome: 'Checklist de cirurgia segura',
    fonte: 'Protocolo para Cirurgia Segura (MS/Anvisa/Fiocruz, 2013), baseado na lista da OMS',
  },
  EVOLUCAO_UTI: {
    nome: 'Evolução diária de UTI',
    fonte: 'RDC Anvisa nº 7/2010 e escalas RASS, Glasgow, Braden e de dor',
  },
} as const

export type ModeloClinico = keyof typeof MODELOS_CLINICOS

export type SituacaoModelo = { validado: boolean; validadoEm: string | null; validadoPorNome: string | null; observacao: string | null }

export function ehModeloClinico(valor: unknown): valor is ModeloClinico {
  return typeof valor === 'string' && valor in MODELOS_CLINICOS
}
