// Jornada do paciente: valores aceitos e transições válidas, aplicadas no servidor.

export const STATUS_PACIENTE = [
  'Recepção',
  'Aguardando Triagem',
  'Em Triagem',
  'Aguardando Médico',
  'Em Atendimento Médico',
  'Internado',
  'Internado - UTI',
  'Alta Médica',
  'Transferido',
  'Evasão',
  'Retorno',
  'Óbito',
] as const

export type StatusPaciente = (typeof STATUS_PACIENTE)[number]

const SAIDAS = ['Alta Médica', 'Transferido', 'Evasão'] as const

const TRANSICOES: Record<StatusPaciente, readonly StatusPaciente[]> = {
  'Recepção': ['Aguardando Triagem', 'Em Triagem', 'Internado', 'Evasão'],
  'Aguardando Triagem': ['Em Triagem', 'Aguardando Médico', 'Recepção', 'Evasão'],
  'Em Triagem': ['Aguardando Médico', 'Em Atendimento Médico', 'Evasão'],
  'Aguardando Médico': ['Em Atendimento Médico', 'Em Triagem', 'Internado', 'Internado - UTI', 'Evasão'],
  'Em Atendimento Médico': ['Aguardando Médico', 'Internado', 'Internado - UTI', ...SAIDAS, 'Retorno'],
  'Internado': ['Internado - UTI', 'Em Atendimento Médico', ...SAIDAS],
  'Internado - UTI': ['Internado', ...SAIDAS],
  'Alta Médica': ['Retorno', 'Aguardando Triagem'],
  'Transferido': ['Retorno', 'Aguardando Triagem'],
  'Evasão': ['Retorno', 'Aguardando Triagem'],
  'Retorno': ['Recepção', 'Aguardando Triagem', 'Em Triagem', 'Aguardando Médico', 'Em Atendimento Médico'],
  'Óbito': [],
}

// Só médico encerra um atendimento com desfecho.
export const STATUS_DESFECHO: readonly StatusPaciente[] = ['Alta Médica', 'Transferido']

export function isStatusPaciente(valor: unknown): valor is StatusPaciente {
  return typeof valor === 'string' && (STATUS_PACIENTE as readonly string[]).includes(valor)
}

export function isTerminal(status: string | null | undefined) {
  return status === 'Óbito'
}

export function transicaoValida(de: string, para: string) {
  if (de === para) return true
  if (!isStatusPaciente(de)) return isStatusPaciente(para) // status legado: permite normalizar
  return isStatusPaciente(para) && TRANSICOES[de].includes(para)
}

export function proximosStatus(de: string): readonly StatusPaciente[] {
  return isStatusPaciente(de) ? TRANSICOES[de] : STATUS_PACIENTE
}
