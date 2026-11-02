// Regras de cirurgia usadas pela API e pela tela. Sem dependência de servidor.

export const STATUS_CIRURGIA = ['AGENDADA', 'EM_PREPARO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as const;
export type StatusCirurgia = (typeof STATUS_CIRURGIA)[number];

export const TRANSICOES_CIRURGIA: Record<StatusCirurgia, readonly StatusCirurgia[]> = {
  AGENDADA: ['EM_PREPARO', 'EM_ANDAMENTO', 'CANCELADA'],
  EM_PREPARO: ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO: ['CONCLUIDA', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
};

export const DURACAO_MAXIMA_HORAS = 24;
// Registros antigos sem duração: mantém o padrão que a tela já usava.
export const DURACAO_PADRAO_HORAS = 2;

// A duração ainda não tem coluna: fica no início de `observacoes`, gravada pelo servidor.
export function textoDuracao(horas: number) {
  return `Duração Prevista: ${horas}h.`;
}

export function duracaoEmHoras(observacoes: string | null | undefined) {
  const achado = observacoes?.match(/Duração Prevista:\s*(\d+(?:[.,]\d+)?)\s*h/);
  const horas = achado ? Number(achado[1].replace(',', '.')) : NaN;
  return horas > 0 && horas <= DURACAO_MAXIMA_HORAS ? horas : DURACAO_PADRAO_HORAS;
}
