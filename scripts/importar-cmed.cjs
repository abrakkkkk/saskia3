// Importa a lista de preços CMED/ANVISA (xlsx) para o catálogo de medicamentos. Só catálogo: preços NÃO são gravados.
// Idempotente: roda de novo a cada lista nova; atualiza o que mudou e acrescenta o que entrou.
//
//   npm install --no-save exceljs@4.4.0
//   $env:DATABASE_URL = "<url do banco>"
//   node scripts/importar-cmed.cjs "C:\caminho\lista_pmc.xlsx"            (simulação)
//   node scripts/importar-cmed.cjs "C:\caminho\lista_pmc.xlsx" --aplicar  (grava)
// Fonte: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos (aba "Lista PMC")
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const ExcelJS = require('exceljs')

const arquivo = process.argv[2]
const aplicar = process.argv.includes('--aplicar')
if (!arquivo) { console.error('Informe o caminho da planilha.'); process.exit(2) }
const url = (process.env.DATABASE_URL || '').trim()
if (aplicar && !url) { console.error('Falta DATABASE_URL.'); process.exit(2) }

const semAcento = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const celula = v => { const x = v && v.result !== undefined ? v.result : v; return x === null || x === undefined ? '' : String(x).trim() }
const limpo = v => { const t = celula(v); return t === '-' || t === '' ? null : t }

;(async () => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(arquivo)
  const ws = wb.getWorksheet('Lista PMC')
  if (!ws) { console.error('Aba "Lista PMC" não encontrada.'); process.exit(1) }

  const cab = ws.getRow(1).values.slice(1).map(celula)
  const col = nome => { const i = cab.findIndex(c => c.toUpperCase().startsWith(nome)); if (i < 0) throw new Error(`Coluna ${nome} não encontrada`); return i + 1 }
  const C = { subst: col('SUBSTÂNCIA'), lab: col('LABORATÓRIO'), ggrem: col('CÓDIGO GGREM'), reg: col('REGISTRO'), prod: col('PRODUTO'), apres: col('APRESENTAÇÃO'), classe: col('CLASSE'), tipo: col('TIPO DE PRODUTO'), restr: col('RESTRIÇÃO HOSPITALAR'), tarja: col('TARJA') }

  const vistos = new Set(); const linhas = []
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return
    const ggrem = celula(row.getCell(C.ggrem).value)
    const produto = celula(row.getCell(C.prod).value)
    if (!ggrem || !produto || vistos.has(ggrem)) return
    vistos.add(ggrem)
    const substancia = celula(row.getCell(C.subst).value).replace(/\s*;\s*/g, ' + ')
    const apresentacao = celula(row.getCell(C.apres).value)
    linhas.push({
      codigoGgrem: ggrem, substancia, produto, apresentacao,
      laboratorio: celula(row.getCell(C.lab).value),
      registro: limpo(row.getCell(C.reg).value), classe: limpo(row.getCell(C.classe).value), tipo: limpo(row.getCell(C.tipo).value),
      tarja: limpo(row.getCell(C.tarja).value)?.replace(/\s*\(\*\)\s*$/, '') ?? null,
      restricaoHospitalar: /^sim$/i.test(celula(row.getCell(C.restr).value)),
      busca: semAcento(`${produto} ${substancia}`),
    })
  })

  console.log(`Apresentações lidas: ${linhas.length} | substâncias distintas: ${new Set(linhas.map(l => l.substancia)).size}`)
  console.log('Exemplo:', JSON.stringify(linhas[5]))
  if (!aplicar) { console.log('Simulação. Rode com --aplicar para gravar.'); return }

  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) })
  try {
    let novos = 0, atualizados = 0
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500)
      const existentes = new Set((await prisma.medicamento.findMany({ where: { codigoGgrem: { in: lote.map(l => l.codigoGgrem) } }, select: { codigoGgrem: true } })).map(e => e.codigoGgrem))
      const inserir = lote.filter(l => !existentes.has(l.codigoGgrem))
      if (inserir.length) await prisma.medicamento.createMany({ data: inserir, skipDuplicates: true })
      novos += inserir.length
      for (const l of lote.filter(x => existentes.has(x.codigoGgrem))) {
        const { codigoGgrem, ...resto } = l
        await prisma.medicamento.update({ where: { codigoGgrem }, data: { ...resto, ativo: true } })
        atualizados++
      }
      process.stdout.write(`\r${Math.min(i + 500, linhas.length)}/${linhas.length}`)
    }
    console.log(`\nNovos: ${novos} | atualizados: ${atualizados} | total no catálogo: ${await prisma.medicamento.count()}`)
  } finally { await prisma.$disconnect() }
})().catch(e => { console.error(e.message); process.exit(1) })
