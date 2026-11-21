// Geração dos documentos FHIR R4 enviados à RNDS, conforme o Guia de Integração do Ministério da Saúde:
//   RIA-R (Registro de Imunobiológico Administrado em Rotina): https://rnds-guia.saude.gov.br/docs/ria-rotina/mc-ria-r
//     Bundle document = Composition (BRRegistroImunobiologicoAdministradoRotina-2.0) + Immunization (BRImunobiologicoAdministrado-3.0)
//   REL (Resultado de Exame Laboratorial, COVID-19 e Monkeypox): https://rnds-guia.saude.gov.br/docs/rel/mc-rel
//     Bundle document = Composition (BRResultadoExameLaboratorial-3.2.1) + Condition (BRCondicaoSaude)
//                       + Observation (BRDiagnosticoLaboratorioClinico-3.2.1) + Specimen (BRAmostraBiologica-1.0)
// Funções puras: recebem só o necessário e não tocam o banco.

export const CANONICO = 'http://www.saude.gov.br/fhir/r4'
const SD = (nome: string) => `${CANONICO}/StructureDefinition/${nome}`
const CS = (nome: string) => `${CANONICO}/CodeSystem/${nome}`

export const PERFIL = {
  riaRotina: SD('BRRegistroImunobiologicoAdministradoRotina-2.0'),
  imunobiologico: SD('BRImunobiologicoAdministrado-3.0'),
  rel: SD('BRResultadoExameLaboratorial-3.2.1'),
  diagnostico: SD('BRDiagnosticoLaboratorioClinico-3.2.1'),
  amostra: SD('BRAmostraBiologica-1.0'),
  condicao: SD('BRCondicaoSaude'),
} as const

export const SISTEMA = {
  individuo: SD('BRIndividuo-1.0'),
  estabelecimento: SD('BREstabelecimentoSaude-1.0'),
  tipoDocumento: CS('BRTipoDocumento'),
  imunobiologico: CS('BRImunobiologico'),
  fabricante: CS('BRFabricantePNI'),
  dose: CS('BRDose'),
  estrategia: CS('BREstrategiaVacinacao'),
  via: CS('BRViaAdministracao'),
  local: CS('BRLocalAplicacao'),
  grupoAtendimento: CS('BRGrupoAtendimento'),
  condicaoMaternal: CS('BRCondicaoMaternal'),
  registroOrigem: CS('BRRegistroOrigem'),
  pais: CS('BRPais'),
  cbo: CS('BRCBO'),
  exameLoinc: CS('BRNomeExameLOINC'),
  subgrupoSus: CS('BRSubgrupoTabelaSUS'),
  resultadoQualitativo: CS('BRResultadoQualitativoExame'),
  tipoAmostra: CS('BRTipoAmostraGAL'),
  suspeita: CS('BRTerminologiaSuspeitaDiagnostica'),
} as const

export type Remetente = {
  /** Identificador do solicitante dado pela RNDS ao aprovar o acesso (vai em NamingSystem/BRRNDS-{id}). */
  identificadorSolicitante: string
  cnes: string
}
/** O paciente é identificado por CNS ou CPF (o guia aceita qualquer um dos dois). */
export type PacienteRnds = { cns?: string | null; cpf?: string | null }

export class ErroDocumentoRnds extends Error {}

const dig = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')
const iso = (d: Date) => d.toISOString()
const dia = (d: Date) => d.toISOString().slice(0, 10)
const codificado = (system: string, code: string) => ({ coding: [{ system, code }] })

function identificadorPaciente(p: PacienteRnds) {
  const valor = dig(p.cns) || dig(p.cpf)
  if (!valor) throw new ErroDocumentoRnds('Paciente sem CNS nem CPF: a RNDS exige um dos dois.')
  return { system: SISTEMA.individuo, value: valor }
}

function bundle(rem: Remetente, idLocal: string, agora: Date, entradas: { fullUrl: string; resource: Record<string, unknown> }[]) {
  if (!/^\d+$/.test(rem.identificadorSolicitante)) throw new ErroDocumentoRnds('Identificador do solicitante RNDS não configurado.')
  if (!/^\d{7}$/.test(dig(rem.cnes))) throw new ErroDocumentoRnds('CNES da unidade não configurado.')
  return {
    resourceType: 'Bundle',
    identifier: { system: `${CANONICO}/NamingSystem/BRRNDS-${rem.identificadorSolicitante}`, value: idLocal },
    type: 'document',
    timestamp: iso(agora),
    entry: entradas,
  }
}

/** relatesTo para retificar um registro já aceito: aponta o id que a RNDS devolveu no envio anterior. */
const substituicao = (idRnds?: string | null) => (idRnds ? { relatesTo: [{ code: 'replaces', targetReference: { reference: `Composition/${idRnds}` } }] } : {})

export type VacinaRnds = {
  imunobiologico: string
  fabricante: string
  lote: string
  validade?: Date | null
  dose: string
  estrategia: string
  via: string
  localAplicacao: string
  grupoAtendimento: string
  condicaoMaternal: string
  aplicadaEm: Date
  /** Só para transcrição de caderneta (01) ou vacina no exterior (02). */
  registroOrigem?: string | null
  /** Código BRPais de onde foi aplicada (obrigatório quando registroOrigem = 02). */
  pais?: string | null
}

export function gerarRiaRotina(args: {
  remetente: Remetente
  idLocal: string
  paciente: PacienteRnds
  profissional: { cns: string; cbo?: string | null }
  vacina: VacinaRnds
  substituiIdRnds?: string | null
  agora?: Date
}) {
  const { remetente, idLocal, paciente, profissional, vacina: v } = args
  const agora = args.agora ?? new Date()
  const individuo = identificadorPaciente(paciente)
  const cnsProfissional = dig(profissional.cns)
  if (!cnsProfissional) throw new ErroDocumentoRnds('Profissional que aplicou a vacina sem CNS.')
  if (!v.lote.trim()) throw new ErroDocumentoRnds('Informe o lote do imunobiológico.')

  const imunizacao: Record<string, unknown> = {
    resourceType: 'Immunization',
    meta: { profile: [PERFIL.imunobiologico] },
    extension: [
      { url: SD('BRGrupoAtendimento'), valueCodeableConcept: codificado(SISTEMA.grupoAtendimento, v.grupoAtendimento) },
      { url: SD('BRCondicaoMaternal'), valueCodeableConcept: codificado(SISTEMA.condicaoMaternal, v.condicaoMaternal) },
    ],
    status: 'completed',
    vaccineCode: codificado(SISTEMA.imunobiologico, v.imunobiologico),
    patient: { identifier: individuo },
    occurrenceDateTime: iso(v.aplicadaEm),
    ...(v.registroOrigem ? { primarySource: false, reportOrigin: codificado(SISTEMA.registroOrigem, v.registroOrigem) } : { primarySource: true }),
    ...(v.pais ? { location: { identifier: { system: SISTEMA.pais, value: v.pais } } } : {}),
    manufacturer: { identifier: { system: SISTEMA.fabricante, value: v.fabricante } },
    lotNumber: v.lote.trim(),
    ...(v.validade ? { expirationDate: dia(v.validade) } : {}),
    site: codificado(SISTEMA.local, v.localAplicacao),
    route: codificado(SISTEMA.via, v.via),
    performer: [{
      ...(profissional.cbo ? { function: codificado(SISTEMA.cbo, dig(profissional.cbo)) } : {}),
      actor: { reference: `Practitioner/${cnsProfissional}` },
    }],
    protocolApplied: [{
      extension: [{ url: SD('BREstrategiaVacinacao-1.0'), valueCodeableConcept: codificado(SISTEMA.estrategia, v.estrategia) }],
      doseNumberString: v.dose,
    }],
  }
  const composicao = {
    resourceType: 'Composition',
    meta: { profile: [PERFIL.riaRotina] },
    status: 'final',
    type: codificado(SISTEMA.tipoDocumento, 'RIA'),
    subject: { identifier: individuo },
    date: iso(agora),
    author: [{ identifier: { system: SISTEMA.estabelecimento, value: dig(remetente.cnes) } }],
    title: 'Registro de Imunobiologico Administrado na Rotina',
    ...substituicao(args.substituiIdRnds),
    section: [{ entry: [{ reference: 'urn:uuid:transient-1' }] }],
  }
  return bundle(remetente, idLocal, agora, [
    { fullUrl: 'urn:uuid:transient-0', resource: composicao },
    { fullUrl: 'urn:uuid:transient-1', resource: imunizacao },
  ])
}

export type ExameRnds = {
  /** Código do exame em BRNomeExameLOINC (ex.: 94309-2, SARS-CoV-2 RNA por amplificação). */
  codigoExame: string
  /** BRSubgrupoTabelaSUS: 0202 laboratório clínico, 0214 teste rápido. */
  categoria: string
  /** BRResultadoQualitativoExame: 1 detectável, 2 não detectável, 3 inconclusivo. */
  resultado: string
  /** BRTipoAmostraGAL (ex.: SWNAFA swab nasofaríngeo). */
  amostra: string
  metodo: string
  valorReferencia: string
  /** BRTerminologiaSuspeitaDiagnostica: B342 (coronavírus) ou B04 (monkeypox). */
  suspeita: string
  coletadoEm: Date
  liberadoEm: Date
  observacao?: string | null
}

export function gerarResultadoExame(args: {
  remetente: Remetente
  idLocal: string
  paciente: PacienteRnds
  exame: ExameRnds
  substituiIdRnds?: string | null
  agora?: Date
}) {
  const { remetente, idLocal, paciente, exame: e } = args
  const agora = args.agora ?? new Date()
  const individuo = identificadorPaciente(paciente)
  const estabelecimento = { system: SISTEMA.estabelecimento, value: dig(remetente.cnes) }
  const [uComp, uCond, uObs, uAmostra] = [0, 1, 2, 3].map(i => `urn:uuid:transient-${i}`)

  const observacao = {
    resourceType: 'Observation',
    meta: { profile: [PERFIL.diagnostico] },
    status: 'final',
    category: [codificado(SISTEMA.subgrupoSus, e.categoria)],
    code: codificado(SISTEMA.exameLoinc, e.codigoExame),
    subject: { identifier: individuo },
    effectiveDateTime: iso(e.coletadoEm),
    issued: iso(e.liberadoEm),
    performer: [{ identifier: estabelecimento }],
    valueCodeableConcept: codificado(SISTEMA.resultadoQualitativo, e.resultado),
    ...(e.observacao?.trim() ? { note: [{ text: e.observacao.trim() }] } : {}),
    method: { text: e.metodo.trim() },
    specimen: { reference: uAmostra },
    referenceRange: [{ text: e.valorReferencia.trim() }],
  }
  const amostra = { resourceType: 'Specimen', meta: { profile: [PERFIL.amostra] }, type: codificado(SISTEMA.tipoAmostra, e.amostra) }
  const condicao = {
    resourceType: 'Condition',
    meta: { profile: [PERFIL.condicao] },
    code: codificado(SISTEMA.suspeita, e.suspeita),
    subject: { identifier: individuo },
    stage: [{ assessment: [{ reference: uObs }] }],
  }
  const composicao = {
    resourceType: 'Composition',
    meta: { profile: [PERFIL.rel] },
    status: 'final',
    type: codificado(SISTEMA.tipoDocumento, 'REL'),
    subject: { identifier: individuo },
    date: iso(agora),
    author: [{ identifier: estabelecimento }],
    title: 'Resultado de Exame Laboratorial',
    ...(args.substituiIdRnds ? { relatesTo: [{ code: 'replaces', targetReference: { reference: `Composition/${args.substituiIdRnds}` } }] } : {}),
    section: [{ entry: [{ reference: uCond }, { reference: uObs }] }],
  }
  return bundle(remetente, idLocal, agora, [
    { fullUrl: uComp, resource: composicao },
    { fullUrl: uCond, resource: condicao },
    { fullUrl: uObs, resource: observacao },
    { fullUrl: uAmostra, resource: amostra },
  ])
}
