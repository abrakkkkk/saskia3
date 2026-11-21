// Validador dos recursos FHIR R4 contra os perfis OFICIAIS da RNDS (differential publicado no Simplifier).
// Confere, para cada elemento restringido pelo perfil: cardinalidade (min/max), valores fixos e padrões,
// fatias (extensões por URL, performer por identifier.system, seções por perfil do recurso referenciado),
// tipos de elementos [x], tabelas de códigos obrigatórias (binding "required") e as regras mínimas do FHIR R4 base.
// Não substitui o validador HL7 completo (invariantes FHIRPath), que a RNDS roda na homologação; cobre o que o
// guia descreve como obrigatório. As fontes ficam em src/lib/rnds/*.json, gerados por scripts/atualizar-perfis-rnds.cjs.
import perfisOficiais from './perfis-oficiais.json'
import terminologias from './terminologias.json'

export const CANONICO = 'http://www.saude.gov.br/fhir/r4'

type Elemento = {
  id: string
  path: string
  sliceName?: string
  min?: number
  max?: string
  type?: { code: string; profile?: string[]; targetProfile?: string[] }[]
  valueSet?: string
  slicing?: { type: string; path: string }[]
  [fixo: string]: unknown
}
type Perfil = { url: string; type: string; elementos: Elemento[] }
type No = Record<string, unknown>
export type Problema = { caminho: string; mensagem: string }

const PERFIS = new Map<string, Perfil>((perfisOficiais as Perfil[]).map(p => [p.url, p]))
const TABELAS = terminologias as Record<string, Record<string, string>>

// ValueSets dos perfis -> CodeSystems que os compõem (todos incluem a tabela inteira, conforme o Simplifier).
const CS = (nome: string) => `${CANONICO}/CodeSystem/${nome}`
const HL7 = (nome: string) => `http://hl7.org/fhir/${nome}`
const VALUESETS: Record<string, { sistemas: string[]; codigos?: string[] }> = {
  'BRImunobiologico-1.0': { sistemas: [CS('BRImunobiologico')] },
  'BRFabricanteImunobiologico-1.0': { sistemas: [CS('BRFabricantePNI')] },
  'BRDose-1.0': { sistemas: [CS('BRDose')] },
  'BREstrategiaVacinacao-1.0': { sistemas: [CS('BREstrategiaVacinacao')] },
  'BRLocalAplicacao-1.0': { sistemas: [CS('BRLocalAplicacao')] },
  'BRViaAdministracao-1.0': { sistemas: [CS('BRViaAdministracao')] },
  'BRGrupoAtendimento-1.0': { sistemas: [CS('BRGrupoAtendimento')] },
  'BRCondicaoMaternal-1.0': { sistemas: [CS('BRCondicaoMaternal')] },
  'BRRegistroOrigem': { sistemas: [CS('BRRegistroOrigem')] },
  'BRPais-1.0': { sistemas: [CS('BRPais')] },
  'BROcupacao-1.0': { sistemas: [CS('BRCBO')] },
  'BRTipoDocumento-1.0': { sistemas: [CS('BRTipoDocumento')] },
  'BRNomeExame-2.0': { sistemas: [CS('BRNomeExameLOINC'), CS('BRNomeExameGAL')] },
  'BRCategoriaExame-1.0': { sistemas: [CS('BRSubgrupoTabelaSUS')] },
  'BRResultadoQualitativoExame-1.0': { sistemas: [CS('BRResultadoQualitativoExame')] },
  'BRResultadoQualitativoExame-2.0': {
    sistemas: [CS('BRResultadoQualitativoExame'), ...['AVIDEZ', 'DTNT', 'HISPT', 'PRAU', 'PSNG', 'RGNR', 'RSBAC', 'RSCUL'].map(t => CS(`BRTipoResultado${t}`))],
  },
  'BRTipoAmostra-1.0': { sistemas: ['http://terminology.hl7.org/CodeSystem/v2-0487', CS('BRTipoAmostraGAL')] },
  'BRTerminologiaSuspeitaDiagnostica': { sistemas: [CS('BRTerminologiaSuspeitaDiagnostica')] },
  // Subconjuntos dos códigos do FHIR base (ValueSet nacional publicado com a lista explícita).
  'BREstadoDocumento-1.0': { sistemas: [HL7('composition-status')], codigos: ['preliminary', 'final', 'amended', 'entered-in-error'] },
  'BREstadoEvento-1.0': { sistemas: [HL7('event-status')], codigos: ['preparation', 'in-progress', 'not-done', 'on-hold', 'stopped', 'completed', 'entered-in-error', 'unknown'] },
  'BREstadoObservacao-1.0': { sistemas: [HL7('observation-status')], codigos: ['final', 'entered-in-error'] },
}

// Mínimos do FHIR R4 base para os recursos usados (os perfis herdam e só restringem).
const BASE_R4: Record<string, string[]> = {
  Bundle: ['type'],
  Composition: ['status', 'type', 'date', 'author', 'title'],
  Immunization: ['status', 'vaccineCode', 'patient', 'occurrence[x]'],
  Observation: ['status', 'code'],
  Condition: ['subject'],
  Specimen: [],
}

const DATA = /^\d{4}(-\d{2}(-\d{2})?)?$/
const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/
const INSTANTE = DATA_HORA

const lista = (v: unknown): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v])
const ehObjeto = (v: unknown): v is No => !!v && typeof v === 'object' && !Array.isArray(v)

/** Filhos de um nó por nome de elemento; "value[x]" junta valueString, valueCodeableConcept etc. */
function filhos(no: unknown, nome: string): { chave: string; valor: unknown }[] {
  if (!ehObjeto(no)) return []
  if (nome.endsWith('[x]')) {
    const base = nome.slice(0, -3)
    return Object.keys(no)
      .filter(k => k.startsWith(base) && /^[A-Z]/.test(k.slice(base.length)))
      .flatMap(k => lista(no[k]).map(valor => ({ chave: k, valor })))
  }
  return lista(no[nome]).map(valor => ({ chave: nome, valor }))
}

type Contexto = { perfil: Perfil; resolver: (ref: string) => No | undefined; problemas: Problema[]; prefixo: string }

/** Decide se um nó pertence à fatia (slice) do elemento. */
function naFatia(ctx: Contexto, elementoFatia: Elemento, nome: string, valor: unknown): boolean {
  if (!ehObjeto(valor)) return false
  const fatia = elementoFatia.sliceName!
  if (nome === 'extension' || nome === 'modifierExtension') {
    const url = elementoFatia.type?.[0]?.profile?.[0] ?? fatia
    return valor.url === url
  }
  const sistema = ctx.perfil.elementos.find(e => e.id === `${elementoFatia.id}.identifier.system`)?.fixedUri
  if (typeof sistema === 'string') return ehObjeto(valor.identifier) && valor.identifier.system === sistema
  const alvo = elementoFatia.type?.[0]?.targetProfile?.[0]
  if (alvo && typeof valor.reference === 'string') {
    const recurso = ctx.resolver(valor.reference)
    if (!recurso) return false
    const perfis = ehObjeto(recurso.meta) ? lista(recurso.meta.profile) : []
    return perfis.includes(alvo) || (!perfis.length && PERFIS.get(alvo)?.type === recurso.resourceType)
  }
  return false
}

/** Nós alcançados pelo id do elemento (ex.: "Immunization.extension:grupoAtendimento.value[x].coding"). */
function alcancar(ctx: Contexto, raiz: No, id: string): { pais: unknown[]; nomes: string[] } {
  const partes = id.split('.').slice(1)
  let atuais: unknown[] = [raiz]
  let prefixoId = id.split('.')[0]
  for (let i = 0; i < partes.length; i++) {
    const [nome, fatia] = partes[i].split(':')
    prefixoId += `.${partes[i]}`
    if (i === partes.length - 1) return { pais: atuais, nomes: [nome, fatia ?? ''] }
    const elementoFatia = fatia ? ctx.perfil.elementos.find(e => e.id === prefixoId) : undefined
    atuais = atuais.flatMap(no => filhos(no, nome).map(f => f.valor).filter(v => !elementoFatia || naFatia(ctx, elementoFatia, nome, v)))
  }
  return { pais: [raiz], nomes: ['', ''] }
}

function conferirCodigo(ctx: Contexto, caminho: string, valueSet: string, sistema: unknown, codigo: unknown) {
  const vs = VALUESETS[valueSet.split('/').pop() ?? '']
  if (!vs) return
  if (typeof codigo !== 'string' || !codigo) return
  if (typeof sistema !== 'string' || !vs.sistemas.includes(sistema)) {
    ctx.problemas.push({ caminho, mensagem: `sistema de códigos deve ser ${vs.sistemas.join(' ou ')}` })
    return
  }
  if (vs.codigos && !vs.codigos.includes(codigo)) ctx.problemas.push({ caminho, mensagem: `código "${codigo}" fora da tabela ${valueSet.split('/').pop()}` })
  const tabela = TABELAS[sistema]
  if (tabela && !(codigo in tabela)) ctx.problemas.push({ caminho, mensagem: `código "${codigo}" não existe em ${sistema.split('/').pop()}` })
}

function conferirBinding(ctx: Contexto, caminho: string, valueSet: string, valor: unknown) {
  if (ehObjeto(valor) && Array.isArray(valor.coding)) {
    valor.coding.forEach((c, i) => ehObjeto(c) && conferirCodigo(ctx, `${caminho}.coding[${i}]`, valueSet, c.system, c.code))
  } else if (ehObjeto(valor) && 'code' in valor) {
    conferirCodigo(ctx, caminho, valueSet, valor.system, valor.code)
  } else if (typeof valor === 'string') {
    // Código "solto" (ex.: doseNumberString, identifier.value do fabricante): vale a tabela única do ValueSet.
    const vs = VALUESETS[valueSet.split('/').pop() ?? '']
    if (vs?.codigos) conferirCodigo(ctx, caminho, valueSet, vs.sistemas[0], valor)
    else if (vs && vs.sistemas.length === 1) conferirCodigo(ctx, caminho, valueSet, vs.sistemas[0], valor)
  }
}

function contem(alvo: unknown, padrao: unknown): boolean {
  if (ehObjeto(padrao)) return ehObjeto(alvo) && Object.entries(padrao).every(([k, v]) => contem(alvo[k], v))
  if (Array.isArray(padrao)) return Array.isArray(alvo) && padrao.every(p => alvo.some(a => contem(a, p)))
  return alvo === padrao
}

function validarContra(perfil: Perfil, recurso: No, resolver: Contexto['resolver'], prefixo: string, problemas: Problema[]) {
  const ctx: Contexto = { perfil, resolver, problemas, prefixo }
  for (const e of perfil.elementos) {
    if (!e.id.includes('.')) continue
    const { pais, nomes: [nome, fatia] } = alcancar(ctx, recurso, e.id)
    const caminho = `${prefixo}${e.id.split('.').slice(1).join('.')}`
    for (const pai of pais) {
      if (!ehObjeto(pai)) continue
      let achados = filhos(pai, nome)
      if (fatia) achados = achados.filter(f => naFatia(ctx, e, nome, f.valor))
      const n = achados.length
      if (e.min !== undefined && n < e.min) problemas.push({ caminho, mensagem: e.min === 1 && !fatia ? 'obrigatório' : `exige no mínimo ${e.min} (há ${n})` })
      if (e.max !== undefined && e.max !== '*' && n > Number(e.max)) problemas.push({ caminho, mensagem: Number(e.max) === 0 ? 'não pode ser informado neste perfil' : `aceita no máximo ${e.max} (há ${n})` })
      if (nome.endsWith('[x]') && e.type?.length) {
        const permitidos = e.type.map(t => nome.slice(0, -3) + t.code[0].toUpperCase() + t.code.slice(1))
        for (const f of achados) if (!permitidos.includes(f.chave)) problemas.push({ caminho, mensagem: `tipo ${f.chave} não permitido (use ${permitidos.join(' ou ')})` })
      }
      for (const f of achados) {
        for (const [k, v] of Object.entries(e)) {
          if (k.startsWith('fixed') && JSON.stringify(f.valor) !== JSON.stringify(v)) problemas.push({ caminho, mensagem: `deve ser ${JSON.stringify(v)}` })
          if (k.startsWith('pattern') && !contem(f.valor, v)) problemas.push({ caminho, mensagem: `deve conter ${JSON.stringify(v)}` })
        }
        if (e.valueSet) conferirBinding(ctx, caminho, e.valueSet, f.valor)
        // Extensão com perfil próprio (ex.: BREstrategiaVacinacao-1.0): valida a extensão contra ele.
        const perfilExtensao = nome === 'extension' && e.type?.[0]?.profile?.[0] ? PERFIS.get(e.type[0].profile[0]) : undefined
        if (perfilExtensao && ehObjeto(f.valor)) validarContra(perfilExtensao, f.valor, resolver, `${caminho}.`, problemas)
      }
    }
  }
}

function validarBase(recurso: No, prefixo: string, problemas: Problema[]) {
  for (const campo of BASE_R4[String(recurso.resourceType)] ?? []) {
    if (!filhos(recurso, campo).length) problemas.push({ caminho: `${prefixo}${campo}`, mensagem: 'obrigatório (FHIR R4)' })
  }
  const datas: [string, RegExp][] = [['date', DATA_HORA], ['occurrenceDateTime', DATA_HORA], ['effectiveDateTime', DATA_HORA], ['issued', INSTANTE], ['expirationDate', DATA], ['timestamp', INSTANTE]]
  for (const [campo, formato] of datas) {
    const v = recurso[campo]
    if (v !== undefined && (typeof v !== 'string' || !formato.test(v))) problemas.push({ caminho: `${prefixo}${campo}`, mensagem: 'data/hora fora do formato FHIR (com fuso horário)' })
  }
}

/**
 * Valida um Bundle "document" da RNDS: estrutura do documento, cada recurso contra o perfil declarado em meta.profile
 * e as referências internas (urn:uuid) entre eles. Mensagens nunca trazem valores de identificação do paciente.
 */
export function validarDocumento(bundle: unknown): Problema[] {
  const problemas: Problema[] = []
  if (!ehObjeto(bundle) || bundle.resourceType !== 'Bundle') return [{ caminho: 'Bundle', mensagem: 'não é um Bundle FHIR' }]
  validarBase(bundle, 'Bundle.', problemas)
  if (bundle.type !== 'document') problemas.push({ caminho: 'Bundle.type', mensagem: 'deve ser "document"' })
  const id = bundle.identifier
  if (!ehObjeto(id) || typeof id.system !== 'string' || !id.system.startsWith(`${CANONICO}/NamingSystem/BRRNDS-`) || typeof id.value !== 'string' || !id.value) {
    problemas.push({ caminho: 'Bundle.identifier', mensagem: `system deve ser ${CANONICO}/NamingSystem/BRRNDS-{identificador do solicitante} e value o identificador local do registro` })
  }
  const entradas = lista(bundle.entry).filter(ehObjeto)
  if (!entradas.length) return [...problemas, { caminho: 'Bundle.entry', mensagem: 'obrigatório' }]
  const porUrl = new Map<string, No>()
  for (const e of entradas) if (typeof e.fullUrl === 'string' && ehObjeto(e.resource)) porUrl.set(e.fullUrl, e.resource)
  if (porUrl.size !== entradas.length) problemas.push({ caminho: 'Bundle.entry', mensagem: 'toda entrada precisa de fullUrl único e resource' })
  const primeiro = entradas[0].resource
  if (!ehObjeto(primeiro) || primeiro.resourceType !== 'Composition') problemas.push({ caminho: 'Bundle.entry[0]', mensagem: 'a primeira entrada de um documento é a Composition' })

  const resolver = (ref: string) => porUrl.get(ref)
  entradas.forEach((e, i) => {
    const r = e.resource
    if (!ehObjeto(r)) return
    const prefixo = `Bundle.entry[${i}].${String(r.resourceType)}.`
    validarBase(r, prefixo, problemas)
    const perfis = ehObjeto(r.meta) ? lista(r.meta.profile).filter((p): p is string => typeof p === 'string') : []
    if (!perfis.length) problemas.push({ caminho: `${prefixo}meta.profile`, mensagem: 'informe o perfil da RNDS' })
    for (const url of perfis) {
      const perfil = PERFIS.get(url)
      if (!perfil) { problemas.push({ caminho: `${prefixo}meta.profile`, mensagem: `perfil não reconhecido: ${url}` }); continue }
      if (perfil.type !== r.resourceType) problemas.push({ caminho: `${prefixo}meta.profile`, mensagem: `perfil é de ${perfil.type}` })
      validarContra(perfil, r, resolver, prefixo, problemas)
    }
  })
  // Referências internas precisam apontar para uma entrada do próprio Bundle.
  const refs = JSON.stringify(bundle).match(/"reference":"(urn:uuid:[^"]+)"/g) ?? []
  for (const m of refs) {
    const ref = m.slice(13, -1)
    if (!porUrl.has(ref)) problemas.push({ caminho: 'Bundle', mensagem: `referência ${ref} sem entrada correspondente` })
  }
  return problemas
}

/** Perfis disponíveis (para a tela e os testes). */
export const perfisCarregados = () => [...PERFIS.keys()]
export const descricaoCodigo = (sistema: string, codigo: string) => TABELAS[sistema]?.[codigo] ?? null
export const tabela = (sistema: string) => TABELAS[sistema] ?? {}
