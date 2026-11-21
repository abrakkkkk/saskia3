/* eslint-disable @typescript-eslint/no-require-imports -- script Node avulso (CommonJS), como os demais importadores */
// Baixa os perfis FHIR oficiais da RNDS (StructureDefinition, differential) e os CodeSystems usados pelo Saskia,
// guarda as cópias sem alteração em tests/fixtures/rnds/ e gera o resumo usado em produção pelo validador:
// src/lib/rnds/perfis-oficiais.json (restrições dos perfis) e src/lib/rnds/terminologias.json (códigos válidos).
//
// Fonte oficial: projeto "Rede Nacional de Dados em Saúde" no Simplifier, publicado pelo Ministério da Saúde/DATASUS
// e indicado pelo Guia de Integração (https://rnds-guia.saude.gov.br/docs/ria-rotina/mc-ria-r e /docs/rel/mc-rel):
//   https://fhir.simplifier.net/RedeNacionaldeDadosemSaude/StructureDefinition/{id}
//   https://fhir.simplifier.net/RedeNacionaldeDadosemSaude/CodeSystem/{id}
// O IG em https://rnds-fhir.saude.gov.br (build de 2022) ainda não traz os perfis de vacinação; por isso o Simplifier.
//
// Passo a passo (quando a RNDS publicar versão nova de um perfil ou de uma tabela, ex.: imunobiológico novo):
//   node scripts/atualizar-perfis-rnds.cjs             (baixa tudo e regenera os dois JSON)
//   node scripts/atualizar-perfis-rnds.cjs --offline   (só regenera a partir de tests/fixtures/rnds/)
//   npm test                                           (o teste confere o resumo contra as cópias oficiais)
const fs = require('node:fs')
const path = require('node:path')

const BASE = 'https://fhir.simplifier.net/RedeNacionaldeDadosemSaude'
const RAIZ = path.join(__dirname, '..')
const PASTA = path.join(RAIZ, 'tests', 'fixtures', 'rnds')
const offline = process.argv.includes('--offline')

// id no servidor FHIR do Simplifier -> nome do arquivo local.
const PERFIS = {
  'BRRegistroImunobiologicoAdministradoRotina-2.0': 'BRRegistroImunobiologicoAdministradoRotina-2.0',
  'BRImunobiologicoAdministrado-3.0': 'BRImunobiologicoAdministrado-3.0',
  'BREstrategiaVacinacao-1.0': 'BREstrategiaVacinacao-1.0',
  'BRGrupoAtendimento': 'BRGrupoAtendimento',
  'BRCondicaoMaternal': 'BRCondicaoMaternal',
  '16d06d29-62e7-4a74-a8d7-58106c68ed7a': 'BRResultadoExameLaboratorial-3.2.1',
  '10adbc3a-b1e9-4620-8c02-6f530e2caae0': 'BRDiagnosticoLaboratorioClinico-3.2.1',
  '29d206d7-7107-457f-9164-9c2aa26417ab': 'BRAmostraBiologica-1.0',
  'BRCondicaoSaude': 'BRCondicaoSaude',
}
const CODESYSTEMS = [
  'BRImunobiologico', 'BRFabricantePNI', 'BRDose', 'BREstrategiaVacinacao', 'BRLocalAplicacao', 'BRViaAdministracao',
  'BRGrupoAtendimento', 'BRCondicaoMaternal', 'BRRegistroOrigem', 'BRPais', 'BRCBO', 'BRTipoDocumento',
  'BRNomeExameLOINC', 'BRResultadoQualitativoExame', 'BRSubgrupoTabelaSUS', 'BRTipoAmostraGAL', 'BRTerminologiaSuspeitaDiagnostica',
]

async function baixar(tipo, id) {
  // Perfis sem id legível no Simplifier são buscados pela URL canônica.
  const porUrl = tipo === 'StructureDefinition' && /^BR(GrupoAtendimento|CondicaoMaternal|CondicaoSaude)$/.test(id)
  const url = porUrl ? `${BASE}/${tipo}?url=http://www.saude.gov.br/fhir/r4/${tipo}/${id}` : `${BASE}/${tipo}/${id}`
  const r = await fetch(url, { headers: { accept: 'application/fhir+json' } })
  if (!r.ok) throw new Error(`${tipo}/${id}: HTTP ${r.status}`)
  const json = await r.json()
  return json.resourceType === 'Bundle' ? json.entry[0].resource : json
}

const ler = nome => JSON.parse(fs.readFileSync(path.join(PASTA, nome), 'utf8'))

async function main() {
  fs.mkdirSync(PASTA, { recursive: true })
  if (!offline) {
    for (const [id, nome] of Object.entries(PERFIS)) {
      fs.writeFileSync(path.join(PASTA, `StructureDefinition-${nome}.json`), JSON.stringify(await baixar('StructureDefinition', id), null, 2))
    }
    for (const id of CODESYSTEMS) {
      fs.writeFileSync(path.join(PASTA, `CodeSystem-${id}.json`), JSON.stringify(await baixar('CodeSystem', id), null, 2))
    }
    console.log(`Baixados ${Object.keys(PERFIS).length} perfis e ${CODESYSTEMS.length} CodeSystems em ${PASTA}`)
  }

  const resumoPerfis = Object.values(PERFIS).map(nome => resumirPerfil(ler(`StructureDefinition-${nome}.json`)))
  const terminologias = {}
  for (const id of CODESYSTEMS) {
    const cs = ler(`CodeSystem-${id}.json`)
    const codigos = {}
    const visitar = lista => { for (const c of lista ?? []) { codigos[c.code] = c.display ?? ''; visitar(c.concept) } }
    visitar(cs.concept)
    terminologias[cs.url] = codigos
  }
  const destino = path.join(RAIZ, 'src', 'lib', 'rnds')
  fs.mkdirSync(destino, { recursive: true })
  fs.writeFileSync(path.join(destino, 'perfis-oficiais.json'), JSON.stringify(resumoPerfis, null, 1) + '\n')
  fs.writeFileSync(path.join(destino, 'terminologias.json'), JSON.stringify(terminologias) + '\n')
  console.log(`Gerados src/lib/rnds/perfis-oficiais.json (${resumoPerfis.length} perfis) e terminologias.json (${CODESYSTEMS.length} tabelas).`)
}

/** Mantém do differential só o que o validador usa. Exportado para o teste comparar com as cópias oficiais. */
function resumirPerfil(sd) {
  return {
    url: sd.url,
    type: sd.type,
    elementos: sd.differential.element.map(e => {
      const r = { id: e.id, path: e.path }
      if (e.sliceName) r.sliceName = e.sliceName
      if (e.min !== undefined) r.min = e.min
      if (e.max !== undefined) r.max = e.max
      for (const k of Object.keys(e)) if (/^(fixed|pattern)/.test(k)) r[k] = e[k]
      if (e.type) r.type = e.type.map(t => ({ code: t.code, ...(t.profile ? { profile: t.profile } : {}), ...(t.targetProfile ? { targetProfile: t.targetProfile } : {}) }))
      if (e.binding && e.binding.strength === 'required' && e.binding.valueSet) r.valueSet = e.binding.valueSet
      if (e.slicing) r.slicing = e.slicing.discriminator
      return r
    }),
  }
}

module.exports = { resumirPerfil, PERFIS, CODESYSTEMS }
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })
