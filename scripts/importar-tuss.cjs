/* eslint-disable @typescript-eslint/no-require-imports -- script Node avulso (CommonJS), como os demais importadores */
// Importa terminologias TUSS (ANS) para o catálogo global ProcedimentoTabela.
// Tabelas aceitas: 22 (procedimentos e eventos), 18 (diárias, taxas e gases), 19 (materiais e OPME), 20 (medicamentos)
// e 38 (mensagens de glosa, que fica dentro da planilha "Demais terminologias").
// Idempotente: atualiza o que mudou, acrescenta o que entrou e inativa termos com fim de vigência já passado.
//
// Passo a passo (a cada versão nova da TUSS, em geral trimestral):
//   1) Página oficial: https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss
//      -> "Padrão TISS - <mês/ano>" -> Componente de Representação de Conceitos em Saúde (zip). Ex. da versão 202609:
//      https://www.ans.gov.br/arquivos/extras/tiss/Padrao_TISS_Representacao_de_Conceitos_em_Saude_202609.zip
//   2) Extraia numa pasta vazia (Expand-Archive). As planilhas são "TUSS 22 - PROCEDIMENTOS ... VERSÃO AAAAMM.xlsx" etc.
//   3) npm install --no-save exceljs@4.4.0
//      $env:DATABASE_URL = "<url do banco>"
//      node scripts/importar-tuss.cjs "C:\temp\tuss\TUSS 22 - PROCEDIMENTOS E EVENTOS EM SAÚDE - VERSÃO 202609.xlsx"            (simulação)
//      node scripts/importar-tuss.cjs "C:\temp\tuss\TUSS 22 - PROCEDIMENTOS E EVENTOS EM SAÚDE - VERSÃO 202609.xlsx" --aplicar  (grava)
//      Repita para a TUSS 18 e para "TUSS - Demais terminologias" (importa só a tabela 38). TUSS 19 e 20 são opcionais e grandes.
const path = require('node:path')
const ExcelJS = require('exceljs')
const { Pool } = require('pg')

const arquivo = process.argv[2]
const aplicar = process.argv.includes('--aplicar')
if (!arquivo) { console.error('Informe o caminho da planilha TUSS.'); process.exit(2) }
const url = (process.env.DATABASE_URL || '').trim()
if (aplicar && !url) { console.error('Falta DATABASE_URL.'); process.exit(2) }

const ACEITAS = new Set(['18', '19', '20', '22', '38'])
const versao = (path.basename(arquivo).match(/VERS[ÃA]O\s+(\d{6})/i) || [])[1]
if (!versao) { console.error('Não achei a versão (AAAAMM) no nome do arquivo.'); process.exit(1) }
const celula = v => {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object' && 'result' in v) return celula(v.result)
  if (typeof v === 'object' && 'richText' in v) return v.richText.map(r => r.text).join('')
  if (typeof v === 'object' && 'text' in v) return String(v.text)
  return String(v).trim()
}
const semAcento = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const hoje = new Date().toISOString().slice(0, 10)

;(async () => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(arquivo)
  const linhas = []
  for (const ws of wb.worksheets) {
    const tabela = (ws.name.match(/Tab\s*(\d{2})/i) || [])[1]
    if (!tabela || !ACEITAS.has(tabela)) continue
    let cab = null
    ws.eachRow({ includeEmpty: false }, row => {
      const valores = row.values.slice(1).map(celula)
      if (!cab) { if (/^c[óo]digo do termo$/i.test(valores[0] || '')) cab = valores; return }
      const codigo = valores[0]
      const termo = valores[1]
      if (!/^\d{1,10}$/.test(codigo) || !termo) return
      const iFim = cab.findIndex(c => /fim de vig[êe]ncia/i.test(c))
      const fim = iFim >= 0 ? valores[iFim] : ''
      linhas.push({ tabela, codigo, descricao: termo.replace(/\s+/g, ' ').slice(0, 500), ativo: !fim || fim >= hoje })
    })
  }
  if (!linhas.length) { console.error('Nenhuma tabela TUSS aceita (18, 19, 20, 22, 38) encontrada na planilha.'); process.exit(1) }
  const porTabela = {}
  for (const l of linhas) porTabela[l.tabela] = (porTabela[l.tabela] ?? 0) + 1
  console.log(`TUSS versão ${versao}:`, JSON.stringify(porTabela), `| vigentes: ${linhas.filter(l => l.ativo).length}`)
  console.log('Exemplo:', JSON.stringify(linhas[0]))
  if (!aplicar) { console.log('Simulação. Rode com --aplicar para gravar.'); return }

  // Códigos repetidos (termo com vigência renovada): fica a última linha da planilha.
  const unicos = [...new Map(linhas.map(l => [`${l.tabela}:${l.codigo}`, l])).values()]
  const pool = new Pool({ connectionString: url })
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    for (let i = 0; i < unicos.length; i += 1000) {
      const lote = unicos.slice(i, i + 1000)
      const valores = []
      const marcadores = lote.map((l, j) => {
        const b = j * 6
        valores.push(l.tabela, l.codigo, l.descricao, versao, l.ativo, semAcento(`${l.codigo} ${l.descricao}`))
        return `(gen_random_uuid(), $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, now())`
      })
      await cliente.query(
        `INSERT INTO "ProcedimentoTabela" ("id","tabela","codigo","descricao","versao","ativo","busca","updatedAt") VALUES ${marcadores.join(',')}
         ON CONFLICT ("tabela","codigo") DO UPDATE SET "descricao"=EXCLUDED."descricao","versao"=EXCLUDED."versao","ativo"=EXCLUDED."ativo","busca"=EXCLUDED."busca","updatedAt"=now()`,
        valores,
      )
    }
    await cliente.query('COMMIT')
    console.log(`Gravado: ${unicos.length} termos da TUSS ${versao}.`)
  } catch (erro) {
    await cliente.query('ROLLBACK')
    console.error('Falha, nada foi gravado:', erro.message)
    process.exitCode = 1
  } finally {
    cliente.release()
    await pool.end()
  }
})()
