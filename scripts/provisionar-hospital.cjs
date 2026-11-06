// Cria um hospital novo (tenant) e o primeiro administrador, sem apagar nada.
// Simula por padrão; só grava com --aplicar. A senha é gerada aqui e mostrada UMA vez no seu terminal.
//
//   $env:DATABASE_URL = "<url direta do Neon, sem -pooler>"
//   $env:HOSPITAL_NOME = "Hospital Exemplo"; $env:HOSPITAL_CNPJ = "00.000.000/0001-00"
//   $env:ADMIN_NOME = "Maria Silva"; $env:ADMIN_EMAIL = "maria@hospitalexemplo.com.br"
//   node scripts/provisionar-hospital.cjs            (simulação)
//   node scripts/provisionar-hospital.cjs --aplicar  (grava)
//
// Opcional: ADMIN_SENHA (mínimo de 12 caracteres) para definir a senha em vez de gerar.
const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const exigido = n => { const v = (process.env[n] || '').trim(); if (!v) { console.error(`Falta a variável ${n}.`); process.exit(2) } return v }
const url = exigido('DATABASE_URL')
const nome = exigido('HOSPITAL_NOME')
const cnpj = exigido('HOSPITAL_CNPJ')
const adminNome = exigido('ADMIN_NOME')
const email = exigido('ADMIN_EMAIL').toLowerCase()
const aplicar = process.argv.includes('--aplicar')

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error('ADMIN_EMAIL inválido.'); process.exit(2) }
if (nome.length > 160 || adminNome.length > 160) { console.error('Nome longo demais (máx. 160).'); process.exit(2) }

// Sem caracteres ambíguos (0/O, 1/l/I) para quem digita a senha à mão.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
const gerarSenha = () => Array.from(crypto.randomBytes(18), b => ALFABETO[b % ALFABETO.length]).slice(0, 16).join('')
const senhaInformada = process.env.ADMIN_SENHA
if (senhaInformada && senhaInformada.length < 12) { console.error('ADMIN_SENHA precisa ter pelo menos 12 caracteres.'); process.exit(2) }
const senha = senhaInformada || gerarSenha()

;(async () => {
  const host = new URL(url.replace(/^postgres(ql)?:/, 'http:')).host
  console.log(`Banco: ${host.replace(/^[^.]+/, '***')} | modo: ${aplicar ? 'APLICAR' : 'simulação'}`)
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) })
  try {
    const hospitalExistente = await prisma.hospital.findUnique({ where: { cnpj }, select: { id: true } })
    if (hospitalExistente) { console.error('Já existe hospital com esse CNPJ. Nada foi feito.'); process.exit(1) }
    const emailExistente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } })
    if (emailExistente) { console.error('Já existe usuário com esse e-mail. Nada foi feito.'); process.exit(1) }
    if (!aplicar) { console.log(`Criaria o hospital "${nome}" (CNPJ ${cnpj}) e o administrador ${email}. Rode com --aplicar para gravar.`); return }

    const hash = await bcrypt.hash(senha, 12)
    await prisma.$transaction(async tx => {
      const hospital = await tx.hospital.create({ data: { nome, cnpj, ativo: true } })
      await tx.usuario.create({ data: { hospitalId: hospital.id, nome: adminNome, email, senha: hash, cargo: 'ADMIN' } })
    })
    console.log('\nCriado com sucesso.')
    console.log(`  Hospital: ${nome}`)
    console.log(`  Login:    ${email}`)
    if (!senhaInformada) console.log(`  Senha:    ${senha}   <- anote agora; não será mostrada de novo. Peça para trocar no primeiro acesso (Minha Conta).`)
  } finally {
    await prisma.$disconnect()
  }
})().catch(e => { console.error(e.message); process.exit(1) })
