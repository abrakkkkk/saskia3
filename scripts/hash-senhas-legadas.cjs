// Converte senhas ainda em texto puro para bcrypt, preservando a senha atual de cada usuário.
// Rode UMA vez antes de publicar o código que removeu a comparação em texto puro.
//   Simulação (não grava): DATABASE_URL=... node scripts/hash-senhas-legadas.cjs
//   Aplicar:               DATABASE_URL=... node scripts/hash-senhas-legadas.cjs --aplicar
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL ausente'); process.exit(2) }
const aplicar = process.argv.includes('--aplicar')
const ehBcrypt = s => /^\$2[aby]\$\d{2}\$.{53}$/.test(s)

;(async () => {
  const pool = new Pool({ connectionString: url })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const usuarios = await prisma.usuario.findMany({ select: { id: true, senha: true } })
  const pendentes = usuarios.filter(u => !ehBcrypt(u.senha))
  console.log(`usuários: ${usuarios.length} | senha sem hash: ${pendentes.length} | modo: ${aplicar ? 'APLICAR' : 'simulação'}`)
  for (const u of pendentes) {
    if (!aplicar) continue
    const hash = await bcrypt.hash(u.senha, 12)
    await prisma.usuario.update({ where: { id: u.id }, data: { senha: hash } })
  }
  if (aplicar) {
    const depois = await prisma.usuario.findMany({ select: { senha: true } })
    console.log(`sem hash após a execução: ${depois.filter(u => !ehBcrypt(u.senha)).length}`)
  }
  await prisma.$disconnect()
})().catch(e => { console.error(e.message); process.exit(1) })
