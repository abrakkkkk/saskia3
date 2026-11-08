// Marca no catálogo de medicamentos (CMED) as SUBSTÂNCIAS que constam na RENAME (Relação Nacional de Medicamentos
// Essenciais, Ministério da Saúde). A marcação é por substância (e associação), não por concentração/forma.
// Casamento aproximado: tira sais e hidratos ("cloridrato de", "sódica"...) dos dois lados e compara o resto.
//
//   python -m pip install pypdf
//   python scripts/extrair-pdf-texto.py "C:\caminho\rename2024.pdf" "C:\caminho\rename.txt"
//   $env:DATABASE_URL = "<url do banco>"
//   node scripts/importar-rename.cjs "C:\caminho\rename.txt"            (simulação: mostra cobertura)
//   node scripts/importar-rename.cjs "C:\caminho\rename.txt" --aplicar  (grava)
// Fonte: https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024_2ed.pdf
const fs = require('node:fs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const arquivo = process.argv[2]
const aplicar = process.argv.includes('--aplicar')
if (!arquivo) { console.error('Informe o arquivo de texto da RENAME.'); process.exit(2) }
const url = (process.env.DATABASE_URL || '').trim()
if (!url) { console.error('Falta DATABASE_URL.'); process.exit(2) }

const semAcento = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const SAL = new Set(('de do da dos das cloridrato dicloridrato sulfato bissulfato fosfato sodica sodico potassica potassico calcica calcico magnesica ' +
  'acetato maleato besilato mesilato dimesilato tartarato hemitartarato bitartarato nitrato citrato succinato fumarato hidratada hidratado monoidratada monoidratado ' +
  'tri-hidratada trihidratada di-hidratada anidra anidro bromidrato hidrobrometo valerato propionato dipropionato benzoato estearato palmitato decanoato cipionato ' +
  'enantato undecilato tosilato oxalato carbonato cloreto brometo iodeto trometamol olamina dissodico hemiidratada hemidratada cetoglutarato embonato pamoato gluconato lactato tiosulfato').split(' '))

/** "Cloridrato de metformina" e "METFORMINA, CLORIDRATO" viram "metformina"; associações viram "a|b" em ordem alfabética. */
function chave(nome) {
  const comps = semAcento(nome).split(/\s\+\s|\s*\/\s/).map(c => {
    const toks = c.replace(/\(.*?\)/g, ' ').split(/[^a-z0-9-]+/).filter(Boolean)
    const util = toks.filter(t => !SAL.has(t))
    return (util.length ? util : toks.filter(t => t !== 'de')).join(' ')
  }).filter(Boolean)
  return comps.sort().join('|')
}

// --- Extrai os nomes (DCB) das tabelas do PDF: linhas de apresentação terminam em código ATC. ---
const ATC = /\b[A-Z]\d{2}[A-Z]{2}\d{2}\b/
const RUIDO = /^(##PAG|\|? ?\d+ ?MINIST|MINIST|continua|continuação|Denomina|Comum Brasileira|\(DCB\)|Concentração|Composição|Forma|Farmacêutica|Componente|da Assistência|Financiamento|Código|ATC$|Classificação|AWaRe|[A-Z]: |\d+$|Relação Nacional|RENAME)/i
const nomes = new Set(); let pend = []
for (const bruto of fs.readFileSync(arquivo, 'utf8').split('\n')) {
  const l = bruto.trim()
  if (!l) continue
  if (l.startsWith('##PAG')) { pend = []; continue }
  if (RUIDO.test(l) || (l.length > 70 && !ATC.test(l))) continue
  if (ATC.test(l)) {
    const i = l.search(/(^|\s)\d/)
    const prefixo = i > 0 ? l.slice(0, i).trim() : ''
    if (prefixo) pend.push(prefixo)
    if (pend.length) {
      const nome = pend.join(' ').replace(/Brasileira \(DCB\)/gi, ' ').replace(/RELAÇÃO NACIONAL DE MEDICAMENTOS ESSENCIAIS|RENAME 2024/g, ' ').replace(/\|\s*\d*/g, ' ').replace(/\s+/g, ' ').trim()
      // Descarta restos de concentração ("10% (0,81 mEq/mL", "equivalente a ...") e fragmentos vazios.
      if (nome && nome.length <= 90 && !/^\d|equivalente|mg|mL/i.test(nome)) nomes.add(nome)
      pend = []
    }
  } else pend.push(l)
}
const chavesRename = new Set([...nomes].map(chave).filter(Boolean))
console.log(`Nomes (DCB) extraídos da RENAME: ${nomes.size} | chaves distintas: ${chavesRename.size}`)

;(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) })
  try {
    const substancias = (await prisma.medicamento.groupBy({ by: ['substancia'], _count: { _all: true } }))
    const casadas = substancias.filter(s => chavesRename.has(chave(s.substancia)))
    const usadas = new Set(casadas.map(s => chave(s.substancia)))
    const semPar = [...chavesRename].filter(k => !usadas.has(k))
    const apresentacoes = casadas.reduce((n, s) => n + s._count._all, 0)
    console.log(`Substâncias do catálogo marcadas: ${casadas.length} de ${substancias.length} | apresentações: ${apresentacoes}`)
    console.log(`Nomes da RENAME sem par no catálogo: ${semPar.length} (${((1 - semPar.length / chavesRename.size) * 100).toFixed(0)}% com par)`)
    console.log('Sem par (amostra):', semPar.slice(0, 40).join(' ; '))
    console.log('Marcadas (amostra):', casadas.slice(0, 25).map(s => s.substancia).join(' ; '))
    if (!aplicar) { console.log('Simulação. Rode com --aplicar para gravar.'); return }
    await prisma.medicamento.updateMany({ data: { rename: false } })
    const r = await prisma.medicamento.updateMany({ where: { substancia: { in: casadas.map(s => s.substancia) } }, data: { rename: true } })
    console.log(`Gravado: ${r.count} apresentações marcadas como RENAME.`)
  } finally { await prisma.$disconnect() }
})().catch(e => { console.error(e.message); process.exit(1) })
