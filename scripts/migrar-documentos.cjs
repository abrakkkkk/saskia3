// Envia o acervo de public/ para o Vercel Blob privado, com o nome padrao, e registra no catalogo.
// Entra como operador da Plataforma (sessao normal) e usa as rotas do proprio sistema, entao nada de token do Blob aqui.
//
//   $env:SASKIA_URL = "https://saskia3.vercel.app"
//   $env:SASKIA_EMAIL = "admin@hospitalalfa.com"
//   $env:SASKIA_HOSPITAL = "Hospital Geral Alfa"      (nome exato do hospital do operador)
//   $env:SASKIA_SENHA_ARQUIVO = "C:\fora-do-repo\nova-senha.txt"   (linha "Nova senha: ...")
//   node scripts/migrar-documentos.cjs            (simulacao: confere arquivos, nomes e duplicatas)
//   node scripts/migrar-documentos.cjs --aplicar  (envia e registra; pode rodar de novo, so faz o que falta)
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const manifesto = require('./documentos-manifesto.cjs')

const exigido = n => { const v = (process.env[n] || '').trim(); if (!v) { console.error(`Falta a variavel ${n}.`); process.exit(2) } return v }
const aplicar = process.argv.includes('--aplicar')
const PUBLIC = path.join(__dirname, '..', 'public')
const PASTAS = { BIBLIOTECA: 'biblioteca', CRESCIMENTO: 'crescimento', VACINACAO: 'vacinacao', FICHAS: 'fichas' }
const MIME = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

function resolver(de) {
  const alvo = path.join(PUBLIC, de)
  if (fs.existsSync(alvo)) return alvo
  // nomes com caractere invisivel no inicio (ex.: DEL) ou acento em forma decomposta
  const dir = path.dirname(alvo), base = path.basename(alvo).normalize('NFC')
  if (!fs.existsSync(dir)) return null
  const achado = fs.readdirSync(dir).find(f => f.normalize('NFC') === base || f.normalize('NFC').endsWith(base))
  return achado ? path.join(dir, achado) : null
}

;(async () => {
  const BASE = exigido('SASKIA_URL').replace(/\/$/, '')
  const itens = [], faltando = [], hashes = new Map()
  for (const m of manifesto) {
    const arq = resolver(m.de)
    if (!arq) { if (!m.optional) faltando.push(m.de); continue }
    const buf = fs.readFileSync(arq)
    const hash = crypto.createHash('sha256').update(buf).digest('hex')
    const ext = path.extname(arq).toLowerCase()
    const caminho = hashes.get(hash) ?? `${PASTAS[m.categoria]}/${m.slug}${ext}`
    if (!hashes.has(hash)) hashes.set(hash, caminho)
    itens.push({ ...m, arq, buf, hash, ext, caminho, repetido: hashes.get(hash) !== `${PASTAS[m.categoria]}/${m.slug}${ext}` })
  }
  const slugs = new Set(); for (const i of itens) { if (slugs.has(i.slug)) { console.error('Nome repetido:', i.slug); process.exit(1) } slugs.add(i.slug) }
  const mb = itens.reduce((s, i) => s + (i.repetido ? 0 : i.buf.length), 0) / 1048576
  console.log(`Arquivos no mapa: ${itens.length} | a enviar: ${itens.filter(i => !i.repetido).length} (${mb.toFixed(1)} MB) | compartilhando arquivo igual: ${itens.filter(i => i.repetido).length}`)
  if (faltando.length) { console.error('NAO ENCONTRADOS:\n  ' + faltando.join('\n  ')); process.exit(1) }
  const usados = new Set(itens.map(i => path.resolve(i.arq)))
  const orfaos = ['docs', 'fichass1'].flatMap(d => fs.readdirSync(path.join(PUBLIC, d)).map(f => path.join(PUBLIC, d, f))).filter(f => /\.(pdf|png|jpg)$/i.test(f) && !usados.has(path.resolve(f)))
  if (orfaos.length) console.log('Sem destino no mapa (nao serao enviados):\n  ' + orfaos.map(f => path.relative(PUBLIC, f)).join('\n  '))
  if (!aplicar) { console.log('Simulacao. Rode com --aplicar para enviar.'); return }

  // login (mesmo fluxo do navegador)
  let jar = ''
  const guarda = r => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const k = kv.slice(0, kv.indexOf('=')); jar = jar.split('; ').filter(x => x && !x.startsWith(k + '=')).concat([kv]).join('; ') } }
  const req = async (p, o = {}) => { const r = await fetch(BASE + p, { redirect: 'manual', ...o, headers: { ...(o.headers || {}), cookie: jar } }); guarda(r); return r }
  const senha = fs.readFileSync(exigido('SASKIA_SENHA_ARQUIVO'), 'utf8').match(/Nova senha: (.+)/)[1].trim()
  const hs = await (await fetch(BASE + '/api/hospitais')).json()
  const hosp = hs.find(h => h.nome === exigido('SASKIA_HOSPITAL'))
  if (!hosp) { console.error('Hospital nao encontrado.'); process.exit(1) }
  const { csrfToken } = await (await req('/api/auth/csrf')).json()
  await req('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-auth-return-redirect': '1' }, body: new URLSearchParams({ csrfToken, email: exigido('SASKIA_EMAIL'), senha, hospitalId: hosp.id, json: 'true' }) })
  if (!/session-token/.test(jar)) { console.error('Login falhou.'); process.exit(1) }

  const { put } = await import('@vercel/blob/client')
  const jaEnviados = new Set()
  const existentes = new Set((await (await req('/api/documentos?gerenciar=1')).json()).map?.(d => d.slug) ?? [])
  let ok = 0, pulados = 0
  for (const i of itens) {
    if (existentes.has(i.slug)) { pulados++; continue }
    if (!jaEnviados.has(i.caminho)) {
      const t = await req('/api/documentos/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'blob.generate-client-token', payload: { pathname: i.caminho, clientPayload: null, multipart: i.buf.length > 8 * 1048576 } }) })
      const tj = await t.json()
      if (!t.ok || !tj.clientToken) { console.error('FALHA token', i.slug, tj.error || t.status); process.exit(1) }
      await put(i.caminho, i.buf, { access: 'private', token: tj.clientToken, contentType: MIME[i.ext], multipart: i.buf.length > 8 * 1048576, allowOverwrite: true, addRandomSuffix: false })
      jaEnviados.add(i.caminho)
    }
    const r = await req('/api/documentos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: i.slug, titulo: i.titulo, categoria: i.categoria, grupo: i.grupo, instituicao: i.instituicao, tags: i.tags, arquivo: i.caminho, mime: MIME[i.ext], tamanho: i.buf.length, hash: i.hash, ordem: i.ordem }) })
    if (!r.ok) { console.error('FALHA registro', i.slug, r.status, (await r.text()).slice(0, 120)); process.exit(1) }
    if (i.ativo === false) await req(`/api/documentos/${i.slug}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ativo: false }) })
    ok++; console.log(`ok ${i.categoria.padEnd(11)} ${i.caminho}`)
  }
  console.log(`Concluido: ${ok} registrados, ${pulados} ja existiam.`)
})().catch(e => { console.error(e.message); process.exit(1) })
