// Tipos de prescrição e quem pode emiti-los. A decisão de "quem prescreve o quê" é do gestor da unidade
// (tela de usuários), porque varia: hospital terciário, posto de saúde e clínica têm regras diferentes.

export const TIPOS_PRESCRICAO = [
  { id: 'FARMACOLOGICA', rotulo: 'Farmacológica (medicamentos)', titulo: 'Receituário', curto: 'Medicamentos' },
  { id: 'CUIDADO', rotulo: 'Cuidados', titulo: 'Prescrição de cuidados', curto: 'Cuidados' },
  { id: 'OXIGENOTERAPIA', rotulo: 'Oxigenoterapia', titulo: 'Prescrição de oxigenoterapia', curto: 'Oxigenoterapia' },
  { id: 'DIETA', rotulo: 'Dieta e nutrição', titulo: 'Prescrição dietética', curto: 'Dieta' },
  { id: 'FISIOTERAPIA', rotulo: 'Fisioterapia', titulo: 'Prescrição fisioterapêutica', curto: 'Fisioterapia' },
  { id: 'ODONTOLOGICA', rotulo: 'Odontológica', titulo: 'Prescrição odontológica', curto: 'Odontologia' },
] as const

export type TipoPrescricao = (typeof TIPOS_PRESCRICAO)[number]['id']

export const ehTipoPrescricao = (v: unknown): v is TipoPrescricao =>
  typeof v === 'string' && TIPOS_PRESCRICAO.some(t => t.id === v)

export const tipoPrescricao = (id: string | null | undefined) => TIPOS_PRESCRICAO.find(t => t.id === id) ?? TIPOS_PRESCRICAO[0]

/** Cargos que podem receber autorização para prescrever (o técnico de enfermagem não prescreve). */
export const CARGOS_PRESCRITORES = ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'FISIOTERAPEUTA', 'ODONTOLOGO'] as const

/** Sugestão ao marcar as autorizações; o gestor decide e pode mudar tudo. */
export const SUGESTAO_POR_CARGO: Record<string, TipoPrescricao[]> = {
  MEDICO: ['FARMACOLOGICA', 'CUIDADO', 'OXIGENOTERAPIA', 'DIETA'],
  ENFERMEIRO_ASSISTENCIAL: ['CUIDADO', 'OXIGENOTERAPIA'],
  FISIOTERAPEUTA: ['FISIOTERAPIA', 'OXIGENOTERAPIA'],
  ODONTOLOGO: ['ODONTOLOGICA', 'FARMACOLOGICA'],
}

/** Cargos que podem prescrever (ADMIN incluso: ele emite tudo por regra do sistema, mas também pode ter lista própria). */
export const podeReceberAutorizacao = (cargo: string | null | undefined) =>
  cargo === 'ADMIN' || (CARGOS_PRESCRITORES as readonly string[]).includes(cargo ?? '')

/**
 * Lê `prescricoesAutorizadas` do corpo de uma requisição. `data` indefinido = campo ausente (não mexe).
 * Com `cargo` informado, recusa autorização para quem não pode prescrever (ex.: técnico de enfermagem).
 */
export function lerAutorizacoes(body: Record<string, unknown>, cargo: string | null): { data: TipoPrescricao[] | undefined } | { error: string } {
  if (!('prescricoesAutorizadas' in body)) return { data: undefined }
  const bruto = body.prescricoesAutorizadas
  if (!Array.isArray(bruto) || bruto.length > TIPOS_PRESCRICAO.length || !bruto.every(ehTipoPrescricao)) {
    return { error: 'Tipos de prescrição inválidos' }
  }
  const data = [...new Set(bruto)] as TipoPrescricao[]
  if (data.length > 0 && cargo !== null && !podeReceberAutorizacao(cargo)) {
    return { error: 'Este cargo não pode receber autorização para prescrever' }
  }
  return { data }
}

/** Tipos que o usuário pode emitir: o administrador, todos; os demais, só os que o gestor autorizou. */
export function tiposPermitidos(cargo: string | null | undefined, autorizadas: readonly string[] | null | undefined): TipoPrescricao[] {
  if (cargo === 'ADMIN') return TIPOS_PRESCRICAO.map(t => t.id)
  return (autorizadas ?? []).filter(ehTipoPrescricao)
}
