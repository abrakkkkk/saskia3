// Redefine a senha de UM usuário (suporte: "esqueci a senha"). Simula por padrão; só grava com --aplicar.
// Gera senha forte, derruba as sessões abertas do usuário (sessionVersion) e grava em bcrypt.
//
//   $env:DATABASE_URL = "<url direta do Neon, sem -pooler>"
//   $env:USUARIO_EMAIL = "pessoa@hospital.com.br"
//   $env:SAIDA_ARQUIVO = "C:\caminho\fora-do-repositorio\nova-senha.txt"   (opcional; sem isso a senha aparece no terminal)
//   node scripts/redefinir-senha.cjs            (simulação)
//   node scripts/redefinir-senha.cjs --aplicar  (grava)
const crypto = require('node:crypto')
const fs = require('node:fs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const exigido = n => { const v = (process.env[n] || '').trim(); if (!v) { console.error(`Falta a variável ${n}.`); process.exit(2) } return v }
const url = exigido('DATABASE_URL')
const email = exigido('USUARIO_EMAIL').toLowerCase()
const saida = (process.env.SAIDA_ARQUIVO || '').trim()
const aplicar = process.argv.includes('--aplicar')

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
const senha = Array.from(crypto.randomBytes(18), b => ALFABETO[b % ALFABETO.length]).slice(0, 16).join('')

;(async () => {
  const host = new URL(url.replace(/^postgres(ql)?:/, 'http:')).host
  console.log(`Banco: ${host.replace(/^[^.]+/, '***')} | modo: ${aplicar ? 'APLICAR' : 'simulação'}`)
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) })
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nome: true, cargo: true, ativo: true, hospital: { select: { nome: true } } } })
    if (!usuario) { console.error('Usuário não encontrado. Nada foi feito.'); process.exit(1) }
    console.log(`Usuário: ${usuario.nome} (${usuario.cargo}) | hospital: ${usuario.hospital.nome} | ativo: ${usuario.ativo}`)
    if (!aplicar) { console.log('Rode com --aplicar para trocar a senha.'); return }

    const hash = await bcrypt.hash(senha, 12)
    await prisma.usuario.update({ where: { id: usuario.id }, data: { senha: hash, sessionVersion: { increment: 1 } } })
    if (saida) {
      fs.writeFileSync(saida, `Login: ${email}\nNova senha: ${senha}\n`, { encoding: 'utf8', mode: 0o600 })
      console.log(`Senha trocada. A nova senha foi gravada em: ${saida} (apague o arquivo depois de anotar).`)
    } else {
      console.log(`Senha trocada. Nova senha: ${senha}`)
    }
  } finally {
    await prisma.$disconnect()
  }
})().catch(e => { console.error(e.message); process.exit(1) })
