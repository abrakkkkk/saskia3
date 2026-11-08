// Importa o CID-10 oficial do DATASUS (CSV em ISO-8859-1, separador ;) para a tabela Cid10. Idempotente.
//
//   Baixe e descompacte: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
//   $env:DATABASE_URL = "<url do banco>"
//   node scripts/importar-cid10.cjs "C:\pasta\com\os\csv"            (simulação)
//   node scripts/importar-cid10.cjs "C:\pasta\com\os\csv" --aplicar  (grava)
const fs = require('node:fs')
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const pasta = process.argv[2]
const aplicar = process.argv.includes('--aplicar')
if (!pasta) { console.error('Informe a pasta dos CSV.'); process.exit(2) }
const url = (process.env.DATABASE_URL || '').trim()
if (aplicar && !url) { console.error('Falta DATABASE_URL.'); process.exit(2) }

const semAcento = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const ler = nome => fs.readFileSync(path.join(pasta, nome), 'latin1').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split(';'))

const subs = ler('CID-10-SUBCATEGORIAS.CSV').map(c => ({ cod: c[0].trim(), desc: c[4].trim() })).filter(s => /^[A-Z]\d{3}$/.test(s.cod))
const cats = ler('CID-10-CATEGORIAS.CSV').map(c => ({ cod: c[0].trim(), desc: c[2].trim() })).filter(c => /^[A-Z]\d{2}$/.test(c.cod))
const comFilhas = new Set(subs.map(s => s.cod.slice(0, 3)))

const linhas = [
  ...cats.map(c => ({ codigo: c.cod, descricao: c.desc, tipo: 'CATEGORIA', folha: !comFilhas.has(c.cod) })),
  ...subs.map(s => ({ codigo: `${s.cod.slice(0, 3)}.${s.cod[3]}`, descricao: s.desc, tipo: 'SUBCATEGORIA', folha: true })),
].map(l => ({ ...l, busca: `${l.codigo.replace('.', '').toLowerCase()} ${semAcento(l.descricao)}` }))

console.log(`Categorias: ${cats.length} | subcategorias: ${subs.length} | selecionáveis: ${linhas.filter(l => l.folha).length}`)
console.log('Exemplos:', JSON.stringify(linhas.filter(l => ['A00', 'A00.0', 'E11.9', 'I10', 'J45.0'].includes(l.codigo))))
if (!aplicar) { console.log('Simulação. Rode com --aplicar para gravar.'); return }

;(async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) })
  try {
    await prisma.$transaction(async tx => {
      await tx.cid10.deleteMany({})
      for (let i = 0; i < linhas.length; i += 1000) await tx.cid10.createMany({ data: linhas.slice(i, i + 1000) })
    }, { timeout: 120000 })
    console.log(`Gravado. Total no banco: ${await prisma.cid10.count()}`)
  } finally { await prisma.$disconnect() }
})().catch(e => { console.error(e.message); process.exit(1) })
