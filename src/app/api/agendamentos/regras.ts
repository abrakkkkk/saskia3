// Regras da agenda usadas pela API e pela tela. Sem dependência de servidor.

export const STATUS_AGENDAMENTO = ['AGENDADO', 'CONFIRMADO', 'EM_ESPERA', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU'] as const;
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export const TRANSICOES_AGENDAMENTO: Record<StatusAgendamento, readonly StatusAgendamento[]> = {
  AGENDADO: ['CONFIRMADO', 'EM_ESPERA', 'EM_ATENDIMENTO', 'CANCELADO', 'FALTOU'],
  CONFIRMADO: ['EM_ESPERA', 'EM_ATENDIMENTO', 'CANCELADO', 'FALTOU'],
  EM_ESPERA: ['EM_ATENDIMENTO', 'CANCELADO', 'FALTOU'],
  EM_ATENDIMENTO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
  FALTOU: [],
};

export const STATUS_ENCERRADOS: readonly StatusAgendamento[] = ['CONCLUIDO', 'CANCELADO', 'FALTOU'];

// O agendamento não tem campo de duração: toda marcação ocupa 30 minutos.
export const DURACAO_AGENDAMENTO_MS = 30 * 60 * 1000;
