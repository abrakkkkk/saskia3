// Fonte única de "quem pode o quê". Usada pelas APIs, pelo menu e pelo guard de páginas.
// Ponto de partida a validar com o responsável técnico de cada hospital.

export const CARGOS = [
  'ADMIN',
  'MEDICO',
  'ENFERMEIRO_ASSISTENCIAL',
  'TECNICO_ENFERMAGEM',
  'RECEPCIONISTA',
  'FARMACEUTICO',
  'NUTRICIONISTA',
  'ASSISTENTE_SOCIAL',
  'FISIOTERAPEUTA',
  'ODONTOLOGO',
  'OUTROS',
] as const

export type Cargo = (typeof CARGOS)[number]

export const CARGO_LABEL: Record<Cargo, string> = {
  ADMIN: 'Administrador',
  MEDICO: 'Médico',
  ENFERMEIRO_ASSISTENCIAL: 'Enfermeiro assistencial',
  TECNICO_ENFERMAGEM: 'Técnico de enfermagem',
  RECEPCIONISTA: 'Recepcionista',
  FARMACEUTICO: 'Farmacêutico',
  NUTRICIONISTA: 'Nutricionista',
  ASSISTENTE_SOCIAL: 'Assistente social',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  ODONTOLOGO: 'Odontólogo (inclui bucomaxilofacial)',
  OUTROS: 'Outros profissionais',
}

const ENFERMAGEM: Cargo[] = ['ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM']
const CLINICA: Cargo[] = ['MEDICO', ...ENFERMAGEM]
// Profissionais de nível superior que atendem e prescrevem dentro da sua competência (fisioterapia, odontologia).
const REABILITACAO_ODONTO: Cargo[] = ['FISIOTERAPEUTA', 'ODONTOLOGO']
const TODOS: Cargo[] = [...CARGOS]

const MATRIZ = {
  'paciente:listar': TODOS,
  'paciente:cadastrar': ['ADMIN', 'ENFERMEIRO_ASSISTENCIAL', 'RECEPCIONISTA'],
  // Editar cadastro existente e exportar a lista: inclui o médico (criar só pela Recepção).
  'paciente:editar': ['ADMIN', 'MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'RECEPCIONISTA'],
  'paciente:encaminhar': ['ADMIN', 'RECEPCIONISTA', ...CLINICA],
  'paciente:arquivar': ['ADMIN'],
  'prontuario:ler': [...CLINICA, ...REABILITACAO_ODONTO, 'FARMACEUTICO', 'NUTRICIONISTA'],
  'prontuario:dados-vitais': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'prontuario:desfecho': ['MEDICO'],
  'triagem:registrar': CLINICA,
  'sinais:registrar': CLINICA,
  'escores:registrar': CLINICA,
  'evolucao:registrar': [...CLINICA, ...REABILITACAO_ODONTO],
  'enfermagem:registrar': ENFERMAGEM,
  'medico:registrar': ['MEDICO'],
  'nutricao:registrar': ['NUTRICIONISTA', 'MEDICO'],
  'prescricao:ler': [...CLINICA, ...REABILITACAO_ODONTO, 'FARMACEUTICO'],
  // Quem PODE receber autorização. O que cada um realmente emite é decisão do gestor (ver lib/prescricao).
  'prescricao:registrar': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', ...REABILITACAO_ODONTO],
  'exame:ler': [...CLINICA, ...REABILITACAO_ODONTO, 'FARMACEUTICO'],
  'exame:solicitar': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'exame:coletar': CLINICA,
  'exame:laudar': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'cirurgia:ler': [...CLINICA, 'ADMIN'],
  'cirurgia:gerir': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'uti:ler': [...CLINICA, 'ADMIN'],
  'uti:gerir': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'sangue:ler': [...CLINICA, 'ADMIN'],
  'sangue:gerir': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'ADMIN'],
  'obito:ler': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'ADMIN'],
  'obito:registrar': ['MEDICO'],
  'agenda:ler': ['ADMIN', 'RECEPCIONISTA', ...CLINICA, ...REABILITACAO_ODONTO],
  'agenda:gerir': ['ADMIN', 'RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'chamada:emitir': ['RECEPCIONISTA', ...CLINICA, ...REABILITACAO_ODONTO],
  'chamada:ler': ['ADMIN', 'RECEPCIONISTA', 'OUTROS', ...CLINICA, ...REABILITACAO_ODONTO],
  'farmacia:ler': ['FARMACEUTICO', 'ADMIN', ...CLINICA],
  'farmacia:dispensar': ['FARMACEUTICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'estoque:ler': ['FARMACEUTICO', 'ADMIN', 'OUTROS', ...CLINICA],
  'estoque:gerir': ['FARMACEUTICO', 'ADMIN'],
  'cssd:ler': [...ENFERMAGEM, 'MEDICO', 'ADMIN'],
  'cssd:gerir': ENFERMAGEM,
  'ccih:ler': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'ADMIN'],
  'ccih:gerir': ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'social:ler': ['ASSISTENTE_SOCIAL', 'MEDICO', 'ENFERMEIRO_ASSISTENCIAL'],
  'social:gerir': ['ASSISTENTE_SOCIAL'],
  'recepcao:operar': ['ADMIN', 'RECEPCIONISTA', 'ENFERMEIRO_ASSISTENCIAL'],
  'operacao:ler': TODOS,
  'operacao:abrir': TODOS,
  'operacao:gerir': ['ADMIN', 'ENFERMEIRO_ASSISTENCIAL', 'OUTROS'],
  'seguranca:gerir': ['ADMIN', 'OUTROS'],
  'relatorio:ler': ['ADMIN'],
  'emergencia:acionar': TODOS,
  'emergencia:ler': TODOS,
  'emergencia:encerrar': ['MEDICO', ...ENFERMAGEM],
  'admin:acesso': ['ADMIN'],
  'autenticado': TODOS,
} satisfies Record<string, Cargo[]>

export type Permissao = keyof typeof MATRIZ

/** Decisão do dono: o ADMIN do sistema tem acesso total, a tudo e em todos os módulos. */
export function pode(cargo: string | null | undefined, permissao: Permissao) {
  if (cargo === 'ADMIN') return true
  return !!cargo && (MATRIZ[permissao] as string[]).includes(cargo)
}
