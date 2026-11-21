// CNES (Cadastro Nacional de Estabelecimentos de Saúde): conferência do estabelecimento e da equipe.
// Estabelecimento: API pública de dados abertos do Ministério da Saúde (sem chave, sem dado de paciente):
//   GET https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/{codigo_cnes}
// Equipe: base oficial BASE_DE_DADOS_CNES_AAAAMM.ZIP (ftp://ftp.datasus.gov.br/cnes/), importada por scripts/importar-cnes.cjs.
import { cnsValido, somenteDigitos } from './cns'

export const URL_API_CNES = 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos'

export type EstabelecimentoOficial = {
  cnes: string
  nomeFantasia: string | null
  razaoSocial: string | null
  cnpj: string | null
  municipioIbge: string | null
  uf: string | null
  atualizadoEm: string | null
}

// Código IBGE da UF (2 dígitos) para a sigla.
const UF_POR_CODIGO: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
  '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null)

/** Converte a resposta da API de dados abertos (nomes de campo oficiais) no formato interno. */
export function lerEstabelecimentoOficial(json: unknown): EstabelecimentoOficial | null {
  if (!json || typeof json !== 'object') return null
  const r = json as Record<string, unknown>
  const digitos = somenteDigitos(txt(r.codigo_cnes))
  if (!digitos || digitos.length > 7) return null
  const cnes = digitos.padStart(7, '0')
  const uf = txt(r.codigo_uf)
  return {
    cnes,
    nomeFantasia: txt(r.nome_fantasia),
    razaoSocial: txt(r.nome_razao_social),
    cnpj: somenteDigitos(txt(r.numero_cnpj) ?? txt(r.numero_cnpj_entidade)) || null,
    municipioIbge: somenteDigitos(txt(r.codigo_municipio)) || null,
    uf: uf ? UF_POR_CODIGO[uf.padStart(2, '0')] ?? null : null,
    atualizadoEm: txt(r.data_atualizacao),
  }
}

export async function consultarEstabelecimento(cnes: string, timeoutMs = 10_000): Promise<
  { ok: true; estabelecimento: EstabelecimentoOficial } | { ok: false; erro: string }
> {
  const codigo = somenteDigitos(cnes)
  if (!/^\d{7}$/.test(codigo)) return { ok: false, erro: 'CNES da unidade inválido (7 dígitos).' }
  try {
    const r = await fetch(`${URL_API_CNES}/${codigo}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    if (r.status === 404) return { ok: false, erro: 'CNES não encontrado na base nacional.' }
    if (!r.ok) return { ok: false, erro: `A API do CNES respondeu ${r.status}. Tente mais tarde.` }
    const est = lerEstabelecimentoOficial(await r.json())
    return est ? { ok: true, estabelecimento: est } : { ok: false, erro: 'Resposta da API do CNES em formato inesperado.' }
  } catch {
    return { ok: false, erro: 'Não foi possível consultar a API do CNES agora.' }
  }
}

export type Divergencia = { campo: string; saskia: string | null; cnes: string | null }

const norm = (v: string | null | undefined) => (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()

/** Compara o cadastro do Saskia com o oficial. Nome confere se bater com o fantasia ou a razão social. */
export function compararEstabelecimento(
  oficial: EstabelecimentoOficial,
  local: { nome: string; cnpj: string | null; municipioIbge: string | null; uf: string | null },
): Divergencia[] {
  const d: Divergencia[] = []
  const nome = norm(local.nome)
  if (nome && nome !== norm(oficial.nomeFantasia) && nome !== norm(oficial.razaoSocial)) {
    d.push({ campo: 'Nome', saskia: local.nome, cnes: oficial.nomeFantasia ?? oficial.razaoSocial })
  }
  const cnpj = somenteDigitos(local.cnpj)
  if (oficial.cnpj && cnpj && cnpj !== oficial.cnpj) d.push({ campo: 'CNPJ', saskia: cnpj, cnes: oficial.cnpj })
  const ibge = somenteDigitos(local.municipioIbge).slice(0, 6)
  if (oficial.municipioIbge && ibge !== oficial.municipioIbge.slice(0, 6)) d.push({ campo: 'Município (IBGE)', saskia: ibge || null, cnes: oficial.municipioIbge })
  if (oficial.uf && (local.uf ?? '').toUpperCase() !== oficial.uf) d.push({ campo: 'UF', saskia: local.uf, cnes: oficial.uf })
  return d
}

export type SituacaoProfissional = 'CONFERE' | 'SEM_CNS' | 'CNS_INVALIDO' | 'FORA_DO_CNES' | 'CBO_DIFERENTE'

/**
 * Cruza os usuários do Saskia com a equipe importada do CNES (pelo CNS).
 * Sem importação (lista vazia), só aponta CNS ausente ou inválido.
 */
export function conferirEquipe(
  usuarios: { id: string; nome: string; cargo: string; cns: string | null; cbo: string | null }[],
  equipe: { cns: string; nome: string; cbo: string }[],
): { id: string; nome: string; cargo: string; situacao: SituacaoProfissional; cbosCnes: string[] }[] {
  const porCns = new Map<string, string[]>()
  for (const p of equipe) porCns.set(p.cns, [...(porCns.get(p.cns) ?? []), p.cbo])
  return usuarios.map(u => {
    const cns = somenteDigitos(u.cns)
    const cbosCnes = porCns.get(cns) ?? []
    let situacao: SituacaoProfissional = 'CONFERE'
    if (!cns) situacao = 'SEM_CNS'
    else if (!cnsValido(cns)) situacao = 'CNS_INVALIDO'
    else if (equipe.length && !cbosCnes.length) situacao = 'FORA_DO_CNES'
    else if (u.cbo && cbosCnes.length && !cbosCnes.includes(u.cbo)) situacao = 'CBO_DIFERENTE'
    return { id: u.id, nome: u.nome, cargo: u.cargo, situacao, cbosCnes }
  })
}
