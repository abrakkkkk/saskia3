// Funções puras: seguras tanto no navegador quanto no servidor.

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/** Extrai aaaa-mm-dd do valor gravado, sem converter fuso (o dia nunca desloca). */
export function nascimentoParaInput(valor: string | Date | null | undefined): string {
  if (!valor) return '';
  const texto = valor instanceof Date ? valor.toISOString() : valor;
  return DATA_ISO.exec(texto)?.[0] ?? '';
}

export function formatarNascimento(valor: string | Date | null | undefined): string {
  const data = nascimentoParaInput(valor);
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function calcularIdade(nascimento: string | Date | null | undefined): number | string {
  const data = nascimentoParaInput(nascimento);
  if (!data) return '-';
  const [ano, mes, dia] = data.split('-').map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() + 1 - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) idade--;
  return idade < 0 ? 0 : idade;
}

export function getIniciais(nome: string): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'P';
  return (partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '')).toUpperCase();
}

export function formatarData(data: string | Date): string {
  return new Date(data).toLocaleDateString('pt-BR');
}

export function formatarDataHora(data: string | Date): string {
  return new Date(data).toLocaleString('pt-BR');
}

export function normalizarCpf(cpf: string | null | undefined): string {
  return (cpf ?? '').replace(/\D/g, '');
}

/** Valida os dois dígitos verificadores (módulo 11). Recebe o CPF com ou sem máscara. */
export function cpfValido(cpf: string | null | undefined): boolean {
  const digitos = normalizarCpf(cpf);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const calcular = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(digitos[9]) && calcular(10) === Number(digitos[10]);
}

export function formatarCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const digitos = normalizarCpf(cpf);
  return digitos.length === 11 ? digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
}

export function formatarTelefone(tel: string): string {
  if (!tel) return '';
  return tel.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
}

// Só o que nega ou não informa alergia. Qualquer outro texto dispara o alerta (erra para o lado seguro).
const SEM_ALERGIA = /^(nenhum|nenhuma|nega|nega alergias?|nega alergias? conhecidas?|sem alergias?|sem alergias? conhecidas?|nenhuma alergia|nenhuma alergia conhecida|nenhuma conhecida|nao|não|n\/a|na|desconhecid[oa]s?|nao avaliad[oa]s?|não avaliad[oa]s?|nao informad[oa]s?|não informad[oa]s?|-+|—)\.?$/i;

export function alergiaReal(alergias: string | null | undefined): boolean {
  const texto = (alergias ?? '').trim();
  return texto !== '' && !SEM_ALERGIA.test(texto);
}

/** Célula CSV entre aspas e sem interpretação de fórmula por planilhas. */
export function csvCell(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  const neutralizado = /^[\s=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${neutralizado.replace(/"/g, '""')}"`;
}

export const CARGOS: Record<string, string> = {
  diretor_geral: 'Diretor Geral (CEO)',
  enfermeiro_assistencial: 'Enfermeiro Assistencial',
  medico_especialista: 'Médico Especialista',
  tecnico_enfermagem: 'Técnico de Enfermagem',
  recepcionista: 'Recepcionista',
  farmaceutico: 'Farmacêutico',
  fisioterapeuta: 'Fisioterapeuta',
  nutricionista: 'Nutricionista',
  psicologo: 'Psicólogo',
  assistente_social: 'Assistente Social',
};

export const STATUS_PACIENTE = [
  'Recepção', 'Aguardando Triagem', 'Em Triagem', 'Aguardando Médico',
  'Em Atendimento Médico', 'Internado', 'Internado - UTI', 'Alta Médica', 'Transferido',
  'Evasão', 'Óbito', 'Finalizado', 'Retorno',
] as const;

// Fila clínica: gravidade primeiro, depois quem espera há mais tempo.
export const ORDEM_MANCHESTER = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'] as const;
export const STATUS_ESPERA: readonly string[] = ['Recepção', 'Aguardando Triagem', 'Em Triagem', 'Aguardando Médico'];
export const STATUS_SAIDA: readonly string[] = ['Alta Médica', 'Transferido', 'Evasão', 'Óbito', 'Finalizado'];

type ItemFila = { status: string; classificacao: string | null; esperaDesde?: string | null; createdAt?: string | null };

function indiceGravidade(classificacao: string | null) {
  const indice = (ORDEM_MANCHESTER as readonly string[]).indexOf(classificacao ?? '');
  return indice === -1 ? ORDEM_MANCHESTER.length : indice;
}

export function compararFilaClinica(a: ItemFila, b: ItemFila): number {
  const saidaA = STATUS_SAIDA.includes(a.status) ? 1 : 0;
  const saidaB = STATUS_SAIDA.includes(b.status) ? 1 : 0;
  if (saidaA !== saidaB) return saidaA - saidaB;
  const gravidade = indiceGravidade(a.classificacao) - indiceGravidade(b.classificacao);
  if (gravidade !== 0) return gravidade;
  return new Date(a.esperaDesde ?? a.createdAt ?? 0).getTime() - new Date(b.esperaDesde ?? b.createdAt ?? 0).getTime();
}

export function formatarEspera(desde: string | null | undefined, agora: number): string {
  if (!desde) return '-';
  const minutos = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h ${String(minutos % 60).padStart(2, '0')}min`;
  return `${Math.floor(horas / 24)}d ${horas % 24}h`;
}

export type MewsEntrada = { frequenciaR: string; frequenciaC: string; pressao: string; temperatura: string; avpu: string };
export type MewsResultado =
  | { completo: false; faltando: string[] }
  | { completo: true; total: number; faixa: 'baixo' | 'medio' | 'alto'; rotulo: string };

/** MEWS (Subbe 2001). Sem os cinco parâmetros não há escore: nunca assumir "baixo risco". */
export function calcularMews(e: MewsEntrada): MewsResultado {
  const fr = Number.parseInt(e.frequenciaR, 10);
  const fc = Number.parseInt(e.frequenciaC, 10);
  const pas = Number.parseInt(e.pressao.split('/')[0], 10);
  const temp = Number.parseFloat(e.temperatura);
  const faltando = [
    Number.isNaN(fr) && 'FR',
    Number.isNaN(fc) && 'FC',
    Number.isNaN(pas) && 'PAS',
    Number.isNaN(temp) && 'Temperatura',
    !['A', 'V', 'P', 'U'].includes(e.avpu) && 'Consciência',
  ].filter((item): item is string => Boolean(item));
  if (faltando.length > 0) return { completo: false, faltando };

  let total = 0;
  if (fr < 9) total += 2;
  else if (fr >= 15 && fr <= 20) total += 1;
  else if (fr >= 21 && fr <= 29) total += 2;
  else if (fr >= 30) total += 3;

  if (fc <= 40) total += 2;
  else if (fc <= 50) total += 1;
  else if (fc >= 101 && fc <= 110) total += 1;
  else if (fc >= 111 && fc <= 129) total += 2;
  else if (fc >= 130) total += 3;

  if (pas <= 70) total += 3;
  else if (pas <= 80) total += 2;
  else if (pas <= 100) total += 1;
  else if (pas >= 200) total += 2;

  if (temp < 35 || temp >= 38.5) total += 2;

  if (e.avpu === 'V') total += 1;
  else if (e.avpu === 'P') total += 2;
  else if (e.avpu === 'U') total += 3;

  if (total <= 2) return { completo: true, total, faixa: 'baixo', rotulo: 'Risco baixo - observação' };
  if (total <= 4) return { completo: true, total, faixa: 'medio', rotulo: 'Risco médio - avaliação médica' };
  return { completo: true, total, faixa: 'alto', rotulo: 'Risco alto - emergência' };
}

export const MANCHESTER_CORES: Record<string, { bg: string; text: string; markerColor: string; border: string }> = {
  Vermelho: { bg: '#fef2f2', text: '#b91c1c', markerColor: '#dc2626', border: '#fecaca' },
  Laranja: { bg: '#fff7ed', text: '#c2410c', markerColor: '#ea580c', border: '#fed7aa' },
  Amarelo: { bg: '#fefce8', text: '#854d0e', markerColor: '#ca8a04', border: '#fde68a' },
  Verde: { bg: '#f0fdf4', text: '#15803d', markerColor: '#16a34a', border: '#bbf7d0' },
  Azul: { bg: '#eff6ff', text: '#1d4ed8', markerColor: '#2563eb', border: '#bfdbfe' },
};

type TomStatus = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export const STATUS_TOM: Record<string, TomStatus> = {
  'Recepção': 'neutral',
  'Aguardando Triagem': 'warning',
  'Em Triagem': 'info',
  'Aguardando Médico': 'warning',
  'Em Atendimento Médico': 'info',
  'Internado': 'info',
  'Internado - UTI': 'danger',
  'Alta Médica': 'success',
  'Transferido': 'neutral',
  'Evasão': 'danger',
  'Óbito': 'neutral',
  'Finalizado': 'success',
  'Retorno': 'info',
};
