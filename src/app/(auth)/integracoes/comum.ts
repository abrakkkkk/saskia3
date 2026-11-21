import type { Tone } from '@/components/ui';

export { api, dataTexto, erroTexto } from '../faturamento/comum';

export const dataHoraTexto = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)) : '—';

export type StatusEnvio = 'PENDENTE' | 'ENVIADO' | 'ERRO' | 'SIMULADO';
export const NOME_STATUS: Record<StatusEnvio, string> = { PENDENTE: 'Pendente', ENVIADO: 'Enviado', ERRO: 'Erro', SIMULADO: 'Validado (simulação)' };
export const TOM_STATUS: Record<StatusEnvio, Tone> = { PENDENTE: 'warning', ENVIADO: 'success', ERRO: 'danger', SIMULADO: 'info' };
export const NOME_TIPO: Record<string, string> = { RIA_R: 'Vacina', REL: 'Exame' };
export const NOME_AMBIENTE: Record<string, string> = { SIMULACAO: 'Simulação', HOMOLOGACAO: 'Homologação', PRODUCAO: 'Produção' };

export type Opcao = { codigo: string; nome: string };
