import { prisma } from '@/lib/db'

/** Canais criados sozinhos em cada hospital na primeira vez que o chat é aberto. */
export const CANAIS_PADRAO = [
  { slug: 'plantao', nome: 'Plantão', descricao: 'Avisos gerais do plantão' },
  { slug: 'pronto-socorro', nome: 'Pronto-Socorro', descricao: 'Equipe do pronto-socorro' },
  { slug: 'uti', nome: 'UTI', descricao: 'Equipe da UTI' },
  { slug: 'enfermagem', nome: 'Enfermagem', descricao: 'Equipe de enfermagem' },
] as const

export async function garantirCanais(hospitalId: string) {
  const existentes = await prisma.canalChat.findMany({ where: { hospitalId }, orderBy: { createdAt: 'asc' } })
  if (existentes.length > 0) return existentes
  await prisma.canalChat.createMany({
    data: CANAIS_PADRAO.map(c => ({ hospitalId, ...c })),
    skipDuplicates: true,
  })
  return prisma.canalChat.findMany({ where: { hospitalId }, orderBy: { createdAt: 'asc' } })
}
