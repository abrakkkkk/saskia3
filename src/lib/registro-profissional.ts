/** Registro no conselho profissional: o que identifica quem assina a receita. */
export const CONSELHOS = ['CRM', 'COREN', 'CRF', 'CRN', 'CRESS', 'CREFITO', 'CRO', 'CRP', 'OUTRO'] as const
export type Conselho = (typeof CONSELHOS)[number]

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const

/** Conselho sugerido por cargo, só para pré-preencher o formulário. */
export const CONSELHO_DO_CARGO: Record<string, Conselho> = {
  MEDICO: 'CRM', ENFERMEIRO_ASSISTENCIAL: 'COREN', TECNICO_ENFERMAGEM: 'COREN',
  FARMACEUTICO: 'CRF', NUTRICIONISTA: 'CRN', ASSISTENTE_SOCIAL: 'CRESS', FISIOTERAPEUTA: 'CREFITO', ODONTOLOGO: 'CRO',
}

export type RegistroProfissional = {
  conselho: string | null
  registroNumero: string | null
  registroUf: string | null
  especialidade: string | null
  rqe: string | null
}

const NUMERO = /^[0-9A-Za-z./-]{1,20}$/
const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Lê os campos de registro de um corpo de requisição. Só devolve os campos presentes (para PUT parcial).
 * Conselho, número e UF andam juntos: ou os três, ou nenhum.
 */
export function lerRegistro(body: Record<string, unknown>): { data: Partial<RegistroProfissional> } | { error: string } {
  const campos = ['conselho', 'registroNumero', 'registroUf', 'especialidade', 'rqe'] as const
  if (!campos.some(c => c in body)) return { data: {} }

  const conselho = texto(body.conselho)?.toUpperCase() ?? null
  const numero = texto(body.registroNumero)
  const uf = texto(body.registroUf)?.toUpperCase() ?? null
  const especialidade = texto(body.especialidade)
  const rqe = texto(body.rqe)

  if (conselho && !(CONSELHOS as readonly string[]).includes(conselho)) return { error: 'Conselho profissional inválido' }
  if (uf && !(UFS as readonly string[]).includes(uf)) return { error: 'UF do registro inválida' }
  if (numero && !NUMERO.test(numero)) return { error: 'Número do registro inválido (use letras, números, ponto, barra ou hífen)' }
  if ((conselho || numero || uf) && !(conselho && numero && uf)) return { error: 'Informe conselho, número e UF do registro, ou deixe os três em branco' }
  if (especialidade && especialidade.length > 120) return { error: 'Especialidade muito longa' }
  if (rqe && !NUMERO.test(rqe)) return { error: 'RQE inválido' }

  return { data: { conselho, registroNumero: numero, registroUf: uf, especialidade, rqe } }
}

/** "CRM-CE 12345", ou null se o cadastro estiver incompleto. */
export function formatarRegistro(r: Partial<RegistroProfissional> | null | undefined): string | null {
  if (!r?.conselho || !r.registroNumero || !r.registroUf) return null
  return `${r.conselho}-${r.registroUf} ${r.registroNumero}`
}
