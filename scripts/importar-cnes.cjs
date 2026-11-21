/* eslint-disable @typescript-eslint/no-require-imports -- script Node avulso (CommonJS), como os demais importadores */
// Importa a EQUIPE de um estabelecimento a partir da base oficial do CNES (DATASUS) para CnesProfissional,
// usada na tela Integrações para conferir CNS e CBO dos usuários do Saskia. Confere também o estabelecimento.
// Idempotente: cada execução substitui a equipe do hospital pela da competência lida.
//
// Fonte: base de dados do CNES, publicada todo mês pelo DATASUS (dado público, sem paciente):
//   ftp://ftp.datasus.gov.br/cnes/BASE_DE_DADOS_CNES_AAAAMM.ZIP   (202610 tem ~750 MB; dicionário: DICIONARIO_DE_DADOS.ZIP)
//   Página: https://cnes.datasus.gov.br/pages/downloads/arquivosBaseDados.jsp
//
// Passo a passo (uma vez por competência, ou quando a equipe mudar no CNES):
//   1) Veja a competência mais recente:  curl --list-only ftp://ftp.datasus.gov.br/cnes/ | findstr BASE_DE_DADOS
//   2) Baixe:   curl -o cnes.zip ftp://ftp.datasus.gov.br/cnes/BASE_DE_DADOS_CNES_AAAAMM.ZIP
//   3) Extraia só os 3 arquivos usados numa pasta vazia (o tar do Windows lê zip):
//        mkdir C:\temp\cnes; tar -xf cnes.zip -C C:\temp\cnes tbEstabelecimentoAAAAMM.csv tbCargaHorariaSusAAAAMM.csv tbDadosProfissionalSusAAAAMM.csv
//   4) $env:DATABASE_URL = "<url do banco>"
//      node scripts/importar-cnes.cjs C:\temp\cnes --cnes 1234567 --hospital <id do hospital>            (simulação: só lê e mostra)
//      node scripts/importar-cnes.cjs C:\temp\cnes --cnes 1234567 --hospital <id do hospital> --aplicar  (grava)
// Arquivos: CSV separado por ";" com aspas, ISO-8859-1. Chaves: tbEstabelecimento.CO_UNIDADE -> tbCargaHorariaSus.CO_UNIDADE
// (CO_PROFISSIONAL_SUS, CO_CBO, cargas horárias) -> tbDadosProfissionalSus (NO_PROFISSIONAL, CO_CNS). O CPF vem mascarado.
const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const { Pool } = require('pg')

const args = process.argv.slice(2)
const pasta = args[0]
const opcao = nome => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined }
const cnes = (opcao('--cnes') || '').replace(/\D/g, '')
const hospitalId = opcao('--hospital')
const aplicar = args.includes('--aplicar')
if (!pasta || !/^\d{7}$/.test(cnes)) { console.error('Uso: node scripts/importar-cnes.cjs <pasta> --cnes 1234567 --hospital <id> [--aplicar]'); process.exit(2) }
const url = (process.env.DATABASE_URL || '').trim()
if (aplicar && (!url || !hospitalId)) { console.error('Para gravar: DATABASE_URL e --hospital.'); process.exit(2) }

function arquivo(prefixo) {
  const nome = fs.readdirSync(pasta).find(f => new RegExp(`^${prefixo}\\d{6}\\.csv$`, 'i').test(f))
  if (!nome) { console.error(`Arquivo ${prefixo}AAAAMM.csv não encontrado em ${pasta}.`); process.exit(1) }
  return { caminho: path.join(pasta, nome), competencia: nome.match(/(\d{6})\.csv$/i)[1] }
}

const campos = linha => linha.split(';').map(c => c.replace(/^"|"$/g, '').trim())

/** Lê o CSV em fluxo (os arquivos têm quase 1 GB) e chama `aoLer` com um objeto por linha. */
async function ler(caminho, aoLer) {
  const rl = readline.createInterface({ input: fs.createReadStream(caminho, { encoding: 'latin1' }), crlfDelay: Infinity })
  let cabecalho = null
  for await (const linha of rl) {
    if (!linha.trim()) continue
    const v = campos(linha)
    if (!cabecalho) { cabecalho = v; continue }
    const obj = {}
    cabecalho.forEach((c, i) => { obj[c] = v[i] ?? '' })
    if (aoLer(obj) === false) { rl.close(); break }
  }
}

async function main() {
  const est = arquivo('tbEstabelecimento')
  const carga = arquivo('tbCargaHorariaSus')
  const prof = arquivo('tbDadosProfissionalSus')
  const competencia = est.competencia

  let unidade = null
  await ler(est.caminho, r => { if (r.CO_CNES === cnes) { unidade = r; return false } })
  if (!unidade) { console.error(`CNES ${cnes} não está na base ${competencia}.`); process.exit(1) }
  console.log(`Estabelecimento (competência ${competencia}): ${unidade.NO_FANTASIA} | ${unidade.NO_RAZAO_SOCIAL} | CNPJ ${unidade.NU_CNPJ || unidade.NU_CNPJ_MANTENEDORA} | município ${unidade.CO_MUNICIPIO_GESTOR}`)

  const vinculos = new Map() // CO_PROFISSIONAL_SUS -> Map(cbo -> carga horária semanal)
  await ler(carga.caminho, r => {
    if (r.CO_UNIDADE !== unidade.CO_UNIDADE) return
    const horas = ['QT_CARGA_HORARIA_AMBULATORIAL', 'QT_CARGA_HORARIA_OUTROS', 'QT_CARGA_HOR_HOSP_SUS'].reduce((s, c) => s + (Number(r[c]) || 0), 0)
    const porCbo = vinculos.get(r.CO_PROFISSIONAL_SUS) ?? new Map()
    porCbo.set(r.CO_CBO, (porCbo.get(r.CO_CBO) ?? 0) + horas)
    vinculos.set(r.CO_PROFISSIONAL_SUS, porCbo)
  })

  const linhas = []
  await ler(prof.caminho, r => {
    const porCbo = vinculos.get(r.CO_PROFISSIONAL_SUS)
    if (!porCbo) return
    const cns = r.CO_CNS.replace(/\D/g, '')
    if (!/^\d{15}$/.test(cns)) return
    for (const [cbo, horas] of porCbo) linhas.push({ cns, nome: r.NO_PROFISSIONAL, cbo, cargaHoraria: horas || null })
  })
  const unicos = [...new Map(linhas.map(l => [`${l.cns}|${l.cbo}`, l])).values()]
  console.log(`Equipe: ${vinculos.size} profissionais, ${unicos.length} vínculos (CNS + CBO) com CNS válido.`)

  if (!aplicar) { console.log('Simulação: nada gravado. Use --aplicar para gravar.'); return }

  const pool = new Pool({ connectionString: url })
  const cliente = await pool.connect()
  try {
    const h = await cliente.query('SELECT h.id, c.cnes FROM "Hospital" h LEFT JOIN "ConfigFaturamento" c ON c."hospitalId" = h.id WHERE h.id = $1', [hospitalId])
    if (!h.rowCount) throw new Error('Hospital não encontrado.')
    if (h.rows[0].cnes && h.rows[0].cnes !== cnes) throw new Error(`O CNES cadastrado neste hospital é ${h.rows[0].cnes}, não ${cnes}.`)
    await cliente.query('BEGIN')
    await cliente.query('DELETE FROM "CnesProfissional" WHERE "hospitalId" = $1', [hospitalId])
    for (const l of unicos) {
      await cliente.query(
        'INSERT INTO "CnesProfissional" (id, "hospitalId", cnes, competencia, cns, nome, cbo, "cargaHoraria") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)',
        [hospitalId, cnes, competencia, l.cns, l.nome, l.cbo, l.cargaHoraria],
      )
    }
    await cliente.query('COMMIT')
    console.log(`Gravados ${unicos.length} vínculos da competência ${competencia}.`)
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {})
    console.error(e.message)
    process.exitCode = 1
  } finally {
    cliente.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
