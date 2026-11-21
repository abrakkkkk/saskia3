// Domínios oficiais usados no faturamento. Fonte: TUSS "Demais terminologias" versão 202609 (ANS)
// e layouts do DATASUS (BPA 07/2026, SISAIH01 07/2026). Sem imports: usado por servidor, tela e testes.

export type Opcao = { codigo: string; nome: string }

export const FONTES = ['CONVENIO', 'SUS'] as const
export const GUIAS_TISS = ['CONSULTA', 'SP_SADT', 'RESUMO_INTERNACAO'] as const
export const GUIAS_SUS = ['BPA_C', 'BPA_I', 'AIH'] as const
export const TIPOS_GUIA = [...GUIAS_TISS, ...GUIAS_SUS] as const
export type TipoGuia = (typeof TIPOS_GUIA)[number]

export const NOME_GUIA: Record<TipoGuia, string> = {
  CONSULTA: 'Guia de consulta',
  SP_SADT: 'Guia SP/SADT',
  RESUMO_INTERNACAO: 'Resumo de internação',
  BPA_C: 'BPA consolidado',
  BPA_I: 'BPA individualizado',
  AIH: 'AIH',
}

export const STATUS_CONTA = ['ABERTA', 'FECHADA', 'EM_LOTE', 'ENVIADA', 'PAGA', 'GLOSADA', 'CANCELADA'] as const
export type StatusConta = (typeof STATUS_CONTA)[number]
export const NOME_STATUS_CONTA: Record<StatusConta, string> = {
  ABERTA: 'Aberta', FECHADA: 'Fechada', EM_LOTE: 'Em lote', ENVIADA: 'Enviada', PAGA: 'Paga', GLOSADA: 'Glosada', CANCELADA: 'Cancelada',
}

/** Tabelas de itens aceitas no lançamento. "00" = tabela própria do contrato (TISS). */
export const TABELAS_ITEM: Opcao[] = [
  { codigo: '22', nome: 'TUSS 22 · Procedimentos' },
  { codigo: '18', nome: 'TUSS 18 · Diárias, taxas e gases' },
  { codigo: '19', nome: 'TUSS 19 · Materiais e OPME' },
  { codigo: '20', nome: 'TUSS 20 · Medicamentos' },
  { codigo: '00', nome: 'Tabela própria' },
  { codigo: 'SIGTAP', nome: 'SIGTAP (SUS)' },
]

// TUSS tabela 23
export const CARATER_ATENDIMENTO: Opcao[] = [{ codigo: '1', nome: 'Eletivo' }, { codigo: '2', nome: 'Urgência/Emergência' }]
// TUSS tabela 36
export const INDICACAO_ACIDENTE: Opcao[] = [
  { codigo: '9', nome: 'Não acidente' }, { codigo: '0', nome: 'Trabalho' }, { codigo: '1', nome: 'Trânsito' }, { codigo: '2', nome: 'Outros' },
]
// TUSS tabela 50
export const TIPO_ATENDIMENTO: Opcao[] = [
  { codigo: '04', nome: 'Consulta' }, { codigo: '23', nome: 'Exame' }, { codigo: '03', nome: 'Outras terapias' },
  { codigo: '02', nome: 'Pequena cirurgia' }, { codigo: '13', nome: 'Pequeno atendimento (sutura, gesso e outros)' },
  { codigo: '08', nome: 'Quimioterapia' }, { codigo: '09', nome: 'Radioterapia' }, { codigo: '10', nome: 'Terapia renal substitutiva' },
  { codigo: '01', nome: 'Remoção' },
]
// TUSS tabela 52
export const TIPO_CONSULTA: Opcao[] = [
  { codigo: '1', nome: 'Primeira consulta' }, { codigo: '2', nome: 'Retorno' }, { codigo: '3', nome: 'Pré-natal' }, { codigo: '4', nome: 'Por encaminhamento' },
]
// TUSS tabela 76
export const REGIME_ATENDIMENTO: Opcao[] = [
  { codigo: '01', nome: 'Ambulatorial' }, { codigo: '04', nome: 'Pronto-socorro' }, { codigo: '03', nome: 'Internação' },
  { codigo: '02', nome: 'Domiciliar' }, { codigo: '05', nome: 'Telessaúde' },
]
// TUSS tabela 57
export const TIPO_INTERNACAO: Opcao[] = [
  { codigo: '1', nome: 'Clínica' }, { codigo: '2', nome: 'Cirúrgica' }, { codigo: '3', nome: 'Obstétrica' }, { codigo: '4', nome: 'Pediátrica' }, { codigo: '5', nome: 'Psiquiátrica' },
]
// TUSS tabela 41
export const REGIME_INTERNACAO: Opcao[] = [{ codigo: '1', nome: 'Hospitalar' }, { codigo: '2', nome: 'Hospital-dia' }, { codigo: '3', nome: 'Domiciliar' }]
// TUSS tabela 39 (mesmos códigos do motivo de saída/permanência do SIH)
export const MOTIVO_ENCERRAMENTO: Opcao[] = [
  { codigo: '11', nome: 'Alta curado' }, { codigo: '12', nome: 'Alta melhorado' }, { codigo: '14', nome: 'Alta a pedido' },
  { codigo: '15', nome: 'Alta com previsão de retorno' }, { codigo: '16', nome: 'Alta por evasão' }, { codigo: '18', nome: 'Alta por outros motivos' },
  { codigo: '19', nome: 'Alta de paciente agudo em psiquiatria' },
  { codigo: '21', nome: 'Permanência por características da doença' }, { codigo: '22', nome: 'Permanência por intercorrência' },
  { codigo: '23', nome: 'Permanência por impossibilidade sociofamiliar' }, { codigo: '26', nome: 'Permanência por mudança de procedimento' },
  { codigo: '27', nome: 'Permanência por reoperação' }, { codigo: '28', nome: 'Permanência, outros motivos' },
  { codigo: '31', nome: 'Transferido para outro estabelecimento' }, { codigo: '32', nome: 'Transferência para internação domiciliar' },
  { codigo: '41', nome: 'Óbito com DO do médico assistente' }, { codigo: '42', nome: 'Óbito com DO do IML' }, { codigo: '43', nome: 'Óbito com DO do SVO' },
  { codigo: '51', nome: 'Encerramento administrativo' },
]
// TUSS tabela 25
export const CODIGO_DESPESA: Opcao[] = [
  { codigo: '05', nome: 'Diárias' }, { codigo: '07', nome: 'Taxas e aluguéis' }, { codigo: '03', nome: 'Materiais' },
  { codigo: '02', nome: 'Medicamentos' }, { codigo: '08', nome: 'OPME' }, { codigo: '01', nome: 'Gases medicinais' },
]
// TUSS tabela 26
export const CONSELHOS: Opcao[] = [
  { codigo: '06', nome: 'CRM' }, { codigo: '02', nome: 'COREN' }, { codigo: '08', nome: 'CRO' }, { codigo: '05', nome: 'CREFITO' },
  { codigo: '07', nome: 'CRN' }, { codigo: '03', nome: 'CRF' }, { codigo: '04', nome: 'CREFONO' }, { codigo: '09', nome: 'CRP' },
  { codigo: '01', nome: 'CRESS' }, { codigo: '12', nome: 'CRBM' }, { codigo: '15', nome: 'CRTR' }, { codigo: '10', nome: 'Outros' },
]
// TUSS tabela 59: UF pelo código IBGE.
export const UF_IBGE: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17', MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41', SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
}
// Raça/cor (BPA-I e AIH)
export const RACA_COR: Opcao[] = [
  { codigo: '01', nome: 'Branca' }, { codigo: '02', nome: 'Preta' }, { codigo: '03', nome: 'Parda' },
  { codigo: '04', nome: 'Amarela' }, { codigo: '05', nome: 'Indígena' }, { codigo: '99', nome: 'Sem informação' },
]
// Especialidade do leito (SISAIH01 campo 10, principais)
export const ESPECIALIDADE_AIH: Opcao[] = [
  { codigo: '01', nome: 'Cirúrgico' }, { codigo: '02', nome: 'Obstétrico' }, { codigo: '03', nome: 'Clínico' }, { codigo: '04', nome: 'Crônico' },
  { codigo: '05', nome: 'Psiquiatria' }, { codigo: '07', nome: 'Pediátrico' }, { codigo: '08', nome: 'Reabilitação' },
  { codigo: '74', nome: 'UTI I' }, { codigo: '75', nome: 'UTI adulto II' }, { codigo: '76', nome: 'UTI adulto III' },
  { codigo: '77', nome: 'UTI infantil I' }, { codigo: '78', nome: 'UTI infantil II' }, { codigo: '80', nome: 'UTI neonatal I' },
]

export const nomeDe = (lista: Opcao[], codigo: string | null | undefined) => lista.find(o => o.codigo === codigo)?.nome ?? codigo ?? ''
export const codigoValido = (lista: Opcao[], codigo: unknown): codigo is string => typeof codigo === 'string' && lista.some(o => o.codigo === codigo)

/** Competência AAAAMM a partir de uma data (fuso de Brasília). */
export function competenciaDe(data: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(data)
  const ano = partes.find(p => p.type === 'year')?.value
  const mes = partes.find(p => p.type === 'month')?.value
  return `${ano}${mes}`
}
export const competenciaValida = (c: unknown): c is string => typeof c === 'string' && /^(20\d{2})(0[1-9]|1[0-2])$/.test(c)
