export function calcularIdade(nascimento: string | Date | null): number | string {
  if (!nascimento) return '-';
  const hoje = new Date();
  const dataNasc = new Date(nascimento);
  let idade = hoje.getFullYear() - dataNasc.getFullYear();
  const m = hoje.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) idade--;
  return idade < 0 ? 0 : idade;
}

export function getIniciais(nome: string): string {
  if (!nome) return 'P';
  const partes = nome.split(' ');
  return (partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '')).toUpperCase();
}

export function formatarData(data: string | Date): string {
  return new Date(data).toLocaleDateString('pt-BR');
}

export function formatarDataHora(data: string | Date): string {
  return new Date(data).toLocaleString('pt-BR');
}

export function formatarCPF(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarTelefone(tel: string): string {
  if (!tel) return '';
  return tel.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
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
  'Em Atendimento Médico', 'Internado', 'Alta Médica', 'Transferido',
  'Evasão', 'Óbito', 'Finalizado', 'Retorno',
] as const;

export const MANCHESTER_CORES: Record<string, { bg: string; text: string; emoji: string; border: string }> = {
  Vermelho: { bg: '#fef2f2', text: '#dc2626', emoji: '🔴', border: '#fecaca' },
  Laranja: { bg: '#fff7ed', text: '#ea580c', emoji: '🟠', border: '#fed7aa' },
  Amarelo: { bg: '#fefce8', text: '#ca8a04', emoji: '🟡', border: '#fde68a' },
  Verde: { bg: '#f0fdf4', text: '#16a34a', emoji: '🟢', border: '#bbf7d0' },
  Azul: { bg: '#eff6ff', text: '#2563eb', emoji: '🔵', border: '#bfdbfe' },
};

export const STATUS_CORES: Record<string, { bg: string; text: string }> = {
  'Recepção': { bg: '#f1f5f9', text: '#475569' },
  'Aguardando Triagem': { bg: '#fffbeb', text: '#b45309' },
  'Em Triagem': { bg: '#eff6ff', text: '#2563eb' },
  'Aguardando Médico': { bg: '#f5f3ff', text: '#7c3aed' },
  'Em Atendimento Médico': { bg: '#e0f2fe', text: '#0369a1' },
  'Internado': { bg: '#fce7f3', text: '#be185d' },
  'Alta Médica': { bg: '#dcfce7', text: '#16a34a' },
  'Transferido': { bg: '#fff7ed', text: '#ea580c' },
  'Evasão': { bg: '#fef3c7', text: '#92400e' },
  'Óbito': { bg: '#f1f5f9', text: '#64748b' },
  'Finalizado': { bg: '#dcfce7', text: '#16a34a' },
  'Retorno': { bg: '#f5f3ff', text: '#a855f7' },
};
