// Tabelas oficiais da RNDS usadas no registro de dose e no REL (geradas de tests/fixtures/rnds por
// scripts/atualizar-perfis-rnds.cjs). Dado público, sem paciente.
import terminologias from './terminologias.json'
import { SISTEMA } from './documentos'
import type { DadosExameRel } from './fila'

const T = terminologias as Record<string, Record<string, string>>
const opcoes = (sistema: string) => Object.entries(T[sistema] ?? {}).map(([codigo, nome]) => ({ codigo, nome }))
const existe = (sistema: string, codigo: unknown) => typeof codigo === 'string' && codigo in (T[sistema] ?? {})

export const CAMPOS_VACINA = {
  imunobiologico: { sistema: SISTEMA.imunobiologico, rotulo: 'Imunobiológico' },
  fabricante: { sistema: SISTEMA.fabricante, rotulo: 'Fabricante' },
  dose: { sistema: SISTEMA.dose, rotulo: 'Dose' },
  estrategia: { sistema: SISTEMA.estrategia, rotulo: 'Estratégia' },
  via: { sistema: SISTEMA.via, rotulo: 'Via de administração' },
  localAplicacao: { sistema: SISTEMA.local, rotulo: 'Local de aplicação' },
  grupoAtendimento: { sistema: SISTEMA.grupoAtendimento, rotulo: 'Grupo de atendimento' },
  condicaoMaternal: { sistema: SISTEMA.condicaoMaternal, rotulo: 'Condição maternal' },
} as const
export type CampoVacina = keyof typeof CAMPOS_VACINA

export const CAMPOS_EXAME = {
  codigoExame: { sistema: SISTEMA.exameLoinc, rotulo: 'Exame (LOINC)' },
  categoria: { sistema: SISTEMA.subgrupoSus, rotulo: 'Categoria' },
  resultado: { sistema: SISTEMA.resultadoQualitativo, rotulo: 'Resultado' },
  amostra: { sistema: SISTEMA.tipoAmostra, rotulo: 'Amostra' },
  suspeita: { sistema: SISTEMA.suspeita, rotulo: 'Suspeita diagnóstica' },
} as const

export function tabelasVacina() {
  return {
    ...Object.fromEntries(Object.entries(CAMPOS_VACINA).map(([campo, c]) => [campo, opcoes(c.sistema)])),
    registroOrigem: opcoes(SISTEMA.registroOrigem),
    pais: opcoes(SISTEMA.pais),
  }
}

export function tabelasExame() {
  return {
    ...Object.fromEntries(Object.entries(CAMPOS_EXAME).map(([campo, c]) => [campo, opcoes(c.sistema)])),
    // Na categoria, só os subgrupos de diagnóstico laboratorial aceitos no REL.
    categoria: opcoes(SISTEMA.subgrupoSus).filter(o => o.codigo === '0202' || o.codigo === '0214'),
  }
}

const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null)
const data = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(v)) return null
  const d = new Date(v.length === 10 ? `${v}T12:00:00Z` : v)
  return Number.isNaN(d.getTime()) ? null : d
}

export type DadosVacina = {
  pacienteId: string; imunobiologico: string; fabricante: string; lote: string; validade: Date | null; dose: string; estrategia: string
  via: string; localAplicacao: string; grupoAtendimento: string; condicaoMaternal: string; registroOrigem: string | null; pais: string | null
  aplicadaEm: Date; observacoes: string | null
}

/** Valida o corpo do registro de dose contra as tabelas oficiais. Mensagens sem dado do paciente. */
export function lerDadosVacina(body: Record<string, unknown>, agora = new Date()): { data: DadosVacina } | { error: string } {
  const pacienteId = texto(body.pacienteId, 64)
  if (!pacienteId) return { error: 'Selecione o paciente' }
  const valores: Partial<Record<CampoVacina, string>> = {}
  const padrao: Partial<Record<CampoVacina, string>> = { estrategia: '1', grupoAtendimento: '00', condicaoMaternal: '1' }
  for (const [campo, c] of Object.entries(CAMPOS_VACINA) as [CampoVacina, (typeof CAMPOS_VACINA)[CampoVacina]][]) {
    const v = texto(body[campo], 20) ?? padrao[campo] ?? null
    if (!v || !existe(c.sistema, v)) return { error: `${c.rotulo}: escolha um item da tabela oficial` }
    valores[campo] = v
  }
  const lote = texto(body.lote, 30)
  if (!lote) return { error: 'Informe o lote' }
  const aplicadaEm = data(body.aplicadaEm)
  if (!aplicadaEm || aplicadaEm.getTime() > agora.getTime() + 5 * 60_000) return { error: 'Data da aplicação inválida ou no futuro' }
  const validade = body.validade ? data(body.validade) : null
  if (body.validade && !validade) return { error: 'Validade do lote inválida' }
  const registroOrigem = texto(body.registroOrigem, 2)
  if (registroOrigem && !existe(SISTEMA.registroOrigem, registroOrigem)) return { error: 'Origem do registro inválida' }
  const pais = texto(body.pais, 5)
  if (registroOrigem === '02' && !pais) return { error: 'Vacina no exterior: informe o país' }
  if (pais && !existe(SISTEMA.pais, pais)) return { error: 'País inválido' }
  const observacoes = body.observacoes ? texto(body.observacoes, 500) : null
  return {
    data: {
      pacienteId, lote, validade, aplicadaEm, registroOrigem, pais: registroOrigem === '02' ? pais : null, observacoes,
      ...(valores as Record<CampoVacina, string>),
    },
  }
}

/** Valida os códigos do REL informados ao colocar um exame na fila. */
export function lerDadosExame(body: Record<string, unknown>): { data: DadosExameRel } | { error: string } {
  const valores: Record<string, string> = {}
  for (const [campo, c] of Object.entries(CAMPOS_EXAME)) {
    const v = texto(body[campo], 20)
    if (!v || !existe(c.sistema, v)) return { error: `${c.rotulo}: escolha um item da tabela oficial` }
    valores[campo] = v
  }
  if (valores.categoria !== '0202' && valores.categoria !== '0214') return { error: 'Categoria: use 0202 (laboratório clínico) ou 0214 (teste rápido)' }
  const metodo = texto(body.metodo, 200)
  const valorReferencia = texto(body.valorReferencia, 200)
  if (!metodo || !valorReferencia) return { error: 'Informe o método e o valor de referência' }
  const coletadoEm = data(body.coletadoEm)
  if (!coletadoEm) return { error: 'Data da coleta inválida' }
  return {
    data: {
      codigoExame: valores.codigoExame, categoria: valores.categoria, resultado: valores.resultado, amostra: valores.amostra,
      suspeita: valores.suspeita, metodo, valorReferencia, coletadoEm: coletadoEm.toISOString(),
      observacao: body.observacao ? texto(body.observacao, 500) : null,
    },
  }
}
