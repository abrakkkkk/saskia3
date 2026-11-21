/* eslint-disable @typescript-eslint/no-require-imports -- script Node avulso (CommonJS), como os demais importadores */
// Importa a SIGTAP (Tabela de Procedimentos, Medicamentos e OPM do SUS) para o catálogo global ProcedimentoTabela (tabela "SIGTAP").
// Idempotente: roda a cada competência nova; atualiza o que mudou, acrescenta o que entrou e inativa o que saiu.
//
// Passo a passo (uma vez por competência, normalmente todo mês):
//   1) Veja a competência liberada no RSS oficial: http://sigtap.datasus.gov.br/tabela-unificada/competencias.rss
//   2) Baixe o zip pelo FTP do DATASUS (o endereço http:// e a página de download costumam falhar; o ftp:// responde):
//        curl -o sigtap.zip "ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/TabelaUnificada_AAAAMM_vXXXXXXXXXX.zip"
//      Alternativa oficial: o mesmo arquivo pelo aplicativo SIGTAP Desktop (http://sigtap.datasus.gov.br).
//   3) Extraia numa pasta vazia:  Expand-Archive sigtap.zip C:\temp\sigtap
//   4) $env:DATABASE_URL = "<url do banco>"
//      node scripts/importar-sigtap.cjs C:\temp\sigtap            (simulação: só lê e confere)
//      node scripts/importar-sigtap.cjs C:\temp\sigtap --aplicar  (grava)
// Arquivos usados (layout fixo, ISO-8859-1): tb_procedimento.txt e rl_procedimento_registro.txt.
// Valores VL_SH/VL_SA/VL_SP vêm com 2 casas implícitas (000000001000 = R$ 10,00).
const fs = require('node:fs')
const path = require('node:path')
const { Pool } = require('pg')

const pasta = process.argv[2]
const aplicar = process.argv.includes('--aplicar')
if (!pasta) { console.error('Informe a pasta com os arquivos extraídos da SIGTAP.'); process.exit(2) }
const url = (process.env.DATABASE_URL || '').trim()
if (aplicar && !url) { console.error('Falta DATABASE_URL.'); process.exit(2) }

const ler = nome => {
  const arq = path.join(pasta, nome)
  if (!fs.existsSync(arq)) { console.error(`Arquivo ${nome} não encontrado em ${pasta}.`); process.exit(1) }
  return fs.readFileSync(arq, 'latin1').split(/\r?\n/).filter(l => l.trim())
}
const campo = (linha, ini, fim) => linha.slice(ini - 1, fim).trim()
const numero = t => { const n = Number(t); return Number.isFinite(n) ? n : null }
const valor = t => { const n = numero(t); return n === null ? null : (n / 100).toFixed(2) }
const semAcento = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const registros = new Map()
for (const l of ler('rl_procedimento_registro.txt')) {
  const cod = campo(l, 1, 10)
  const lista = registros.get(cod) ?? []
  lista.push(campo(l, 11, 12))
  registros.set(cod, lista)
}

const linhas = ler('tb_procedimento.txt').map(l => {
  const codigo = campo(l, 1, 10)
  const descricao = campo(l, 11, 260)
  const idadeMin = numero(campo(l, 275, 278))
  const idadeMax = numero(campo(l, 279, 282))
  const dias = numero(campo(l, 267, 270))
  return {
    codigo,
    descricao,
    complexidade: campo(l, 261, 261) || null,
    sexo: campo(l, 262, 262) || null,
    diasPermanencia: dias === 9999 ? null : dias,
    // Idade em meses na SIGTAP; 9999 = sem limite.
    idadeMin: idadeMin === 9999 ? null : idadeMin,
    idadeMax: idadeMax === 9999 ? null : idadeMax,
    valorSh: valor(campo(l, 283, 294)),
    valorSa: valor(campo(l, 295, 306)),
    valorSp: valor(campo(l, 307, 318)),
    competencia: campo(l, 331, 336),
    instrumentos: (registros.get(codigo) ?? []).sort(),
  }
}).filter(l => /^\d{10}$/.test(l.codigo) && l.descricao)

const competencias = [...new Set(linhas.map(l => l.competencia))]
if (competencias.length !== 1 || !/^\d{6}$/.test(competencias[0])) { console.error('Competência inconsistente:', competencias); process.exit(1) }
const competencia = competencias[0]
console.log(`SIGTAP competência ${competencia}: ${linhas.length} procedimentos | com instrumento de registro: ${linhas.filter(l => l.instrumentos.length).length}`)
console.log('Exemplo:', JSON.stringify(linhas.find(l => l.codigo === '0301010072') ?? linhas[0]))
if (!aplicar) { console.log('Simulação. Rode com --aplicar para gravar.'); process.exit(0) }

;(async () => {
  const pool = new Pool({ connectionString: url })
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500)
      const valores = []
      const marcadores = lote.map((l, j) => {
        const b = j * 13
        valores.push(l.codigo, l.descricao, competencia, l.valorSh, l.valorSa, l.valorSp, l.complexidade, l.sexo, l.idadeMin, l.idadeMax, l.diasPermanencia, l.instrumentos, semAcento(`${l.codigo} ${l.descricao}`))
        return `(gen_random_uuid(), 'SIGTAP', $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}, $${b + 12}, true, $${b + 13}, now())`
      })
      await cliente.query(
        `INSERT INTO "ProcedimentoTabela" ("id","tabela","codigo","descricao","versao","valorSh","valorSa","valorSp","complexidade","sexo","idadeMin","idadeMax","diasPermanencia","instrumentos","ativo","busca","updatedAt")
         VALUES ${marcadores.join(',')}
         ON CONFLICT ("tabela","codigo") DO UPDATE SET "descricao"=EXCLUDED."descricao","versao"=EXCLUDED."versao","valorSh"=EXCLUDED."valorSh","valorSa"=EXCLUDED."valorSa","valorSp"=EXCLUDED."valorSp","complexidade"=EXCLUDED."complexidade","sexo"=EXCLUDED."sexo","idadeMin"=EXCLUDED."idadeMin","idadeMax"=EXCLUDED."idadeMax","diasPermanencia"=EXCLUDED."diasPermanencia","instrumentos"=EXCLUDED."instrumentos","ativo"=true,"busca"=EXCLUDED."busca","updatedAt"=now()`,
        valores,
      )
    }
    const inativos = await cliente.query(`UPDATE "ProcedimentoTabela" SET "ativo"=false, "updatedAt"=now() WHERE "tabela"='SIGTAP' AND "versao"<>$1 AND "ativo"=true`, [competencia])
    await cliente.query('COMMIT')
    console.log(`Gravado: ${linhas.length} procedimentos da competência ${competencia}; inativados (saíram da tabela): ${inativos.rowCount}.`)
  } catch (erro) {
    await cliente.query('ROLLBACK')
    console.error('Falha, nada foi gravado:', erro.message)
    process.exitCode = 1
  } finally {
    cliente.release()
    await pool.end()
  }
})()
