import type { Tone } from '@/components/ui';
import type { StatusConta } from '@/lib/faturamento/dominios';

/** fetch com JSON e erro legível vindo da API. */
export async function api<T = unknown>(url: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((dados as { error?: string }).error || 'Não foi possível concluir. Tente de novo.');
  return dados as T;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (v: number | string | null | undefined) => (v === null || v === undefined ? '—' : moeda.format(Number(v)));
export const competenciaTexto = (c?: string | null) => (c && c.length === 6 ? `${c.slice(4)}/${c.slice(0, 4)}` : '—');
export const dataTexto = (d?: string | null) => (d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(d)) : '—');
/** Data ISO para <input type="date"> no fuso de Brasília. */
export const dataInput = (d?: string | null) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(d)) : '');
export const erroTexto = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.');

export const TOM_STATUS: Record<StatusConta, Tone> = {
  ABERTA: 'info', FECHADA: 'violet', EM_LOTE: 'teal', ENVIADA: 'cyan', PAGA: 'success', GLOSADA: 'warning', CANCELADA: 'neutral',
};
export const NOME_STATUS_LOTE: Record<string, string> = { GERADO: 'Gerado', ENVIADO: 'Enviado', PROCESSADO: 'Processado', CANCELADO: 'Cancelado' };
export const TOM_STATUS_LOTE: Record<string, Tone> = { GERADO: 'info', ENVIADO: 'cyan', PROCESSADO: 'success', CANCELADO: 'neutral' };

export type Convenio = { id: string; nome: string; codigoAns: string; cnpj: string | null; codigoPrestador: string | null; versaoTiss: string; status: string };
export type ContaResumo = {
  id: string; numero: number; fonte: 'CONVENIO' | 'SUS'; tipoGuia: string; status: StatusConta; competencia: string;
  dataAtendimento: string; valorTotal: string; valorGlosado: string; valorPago: string | null;
  paciente: { id: string; nome: string }; operadora: { id: string; nome: string } | null; _count: { itens: number };
};
