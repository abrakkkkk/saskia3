import { NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { garantirCanais } from '@/lib/chat'

/** Contadores de não lidas: total, por pessoa (e-mail) e por canal (slug). Alimenta menu, cabeçalho e lista do chat. */
export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const diretas = await prisma.mensagemChat.groupBy({
      by: ['senderId'],
      where: { hospitalId: ator.hospitalId, recipientId: ator.id, lidaEm: null, senderId: { not: null } },
      _count: { _all: true },
    })
    const remetentes = diretas.length
      ? await prisma.usuario.findMany({ where: { id: { in: diretas.map(d => d.senderId as string) } }, select: { id: true, email: true } })
      : []
    const emailDe = new Map(remetentes.map(u => [u.id, u.email]))
    const porContato: Record<string, number> = {}
    for (const d of diretas) {
      const email = emailDe.get(d.senderId as string)
      if (email) porContato[email] = d._count._all
    }

    const canais = await garantirCanais(ator.hospitalId)
    const leituras = await prisma.leituraCanal.findMany({ where: { usuarioId: ator.id, canalId: { in: canais.map(c => c.id) } } })
    const lidoAte = new Map(leituras.map(l => [l.canalId, l.lidoAte]))
    const porCanal: Record<string, number> = {}
    const agora = new Date()
    for (const canal of canais) {
      const marco = lidoAte.get(canal.id)
      if (!marco) {
        // Primeira vez nesse canal: o histórico anterior não vira "não lido".
        await prisma.leituraCanal.upsert({
          where: { usuarioId_canalId: { usuarioId: ator.id, canalId: canal.id } },
          update: {},
          create: { usuarioId: ator.id, canalId: canal.id, lidoAte: agora },
        })
        continue
      }
      const n = await prisma.mensagemChat.count({
        where: { canalId: canal.id, dataHora: { gt: marco }, OR: [{ senderId: { not: ator.id } }, { senderId: null }] },
      })
      if (n > 0) porCanal[canal.slug] = n
    }

    const total = Object.values(porContato).reduce((a, b) => a + b, 0) + Object.values(porCanal).reduce((a, b) => a + b, 0)
    return NextResponse.json({ total, porContato, porCanal })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar não lidas' }, { status: 500 })
  }
}
