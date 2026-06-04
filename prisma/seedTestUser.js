require("dotenv").config({ path: ".env" })
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  let hospital = await prisma.hospital.findFirst({
    where: { nome: "Hospital Teste" },
  })
  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: {
        nome: "Hospital Teste",
        cnpj: "00000000000191",
        ativo: true,
      },
    })
    console.log("Hospital criado:", hospital.id)
  }

  const email = "admin@test.local"
  let user = await prisma.usuario.findFirst({ where: { email } })
  if (!user) {
    user = await prisma.usuario.create({
      data: {
        hospitalId: hospital.id,
        nome: "Administrador Teste",
        email,
        senha: "senha123",
        cargo: "admin",
        ativo: true,
      },
    })
    console.log("Usuário criado:", user.id)
  } else {
    console.log("Usuário já existe:", user.id)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
