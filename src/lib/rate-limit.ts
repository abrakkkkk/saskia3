import { prisma } from '@/lib/db'

const JANELA_MS = 15 * 60 * 1000

// Guardado no banco porque, em serverless, memória local não é compartilhada entre instâncias.
export async function tentativasExcedidas(chave: string, limite: number) {
  const registro = await prisma.tentativaLogin.findUnique({ where: { chave } })
  if (!registro) return false
  if (Date.now() - registro.inicioJanela.getTime() > JANELA_MS) return false
  return registro.falhas >= limite
}

export async function registrarFalha(chave: string) {
  const agora = new Date()
  const registro = await prisma.tentativaLogin.findUnique({ where: { chave } })
  const expirou = !registro || agora.getTime() - registro.inicioJanela.getTime() > JANELA_MS
  await prisma.tentativaLogin.upsert({
    where: { chave },
    create: { chave, falhas: 1, inicioJanela: agora },
    update: expirou ? { falhas: 1, inicioJanela: agora } : { falhas: { increment: 1 } },
  })
}

export async function limparFalhas(chave: string) {
  await prisma.tentativaLogin.deleteMany({ where: { chave } })
}
