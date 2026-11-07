import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { garantirCanais } from '@/lib/chat'

const PAGINA = 200
const CAMPOS = {
  id: true, texto: true, dataHora: true, remetente: true,
  sender: { select: { email: true } },
  recipient: { select: { email: true } },
} as const

type Registro = { id: string; texto: string; dataHora: Date; remetente: string; sender: { email: string } | null; recipient: { email: string } | null }
const apresentar = (m: Registro) => ({ id: m.id, de: m.sender?.email, para: m.recipient?.email, nome: m.remetente, texto: m.texto, data: m.dataHora })

async function canalDoHospital(hospitalId: string, slug: string) {
  const canais = await garantirCanais(hospitalId)
  return canais.find(c => c.slug === slug) ?? null
}

/** Conversa direta (?para=email) ou canal (?canal=slug). Ler marca como lido; ?abrir=1 registra o acesso na auditoria. */
export async function GET(request: NextRequest) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const params = request.nextUrl.searchParams
  const abrir = params.get('abrir') === '1'
  const antes = params.get('antes')
  const limite = antes ? new Date(antes) : null
  if (limite && Number.isNaN(limite.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  const filtroData = limite ? { dataHora: { lt: limite } } : {}

  try {
    const slug = params.get('canal')?.trim().toLowerCase()
    if (slug) {
      const canal = await canalDoHospital(ator.hospitalId, slug)
      if (!canal) return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 })
      const mensagens = await prisma.mensagemChat.findMany({
        where: { hospitalId: ator.hospitalId, canalId: canal.id, ...filtroData },
        orderBy: { dataHora: 'desc' },
        take: PAGINA,
        select: CAMPOS,
      })
      await prisma.leituraCanal.upsert({
        where: { usuarioId_canalId: { usuarioId: ator.id, canalId: canal.id } },
        update: { lidoAte: new Date() },
        create: { usuarioId: ator.id, canalId: canal.id, lidoAte: new Date() },
      })
      if (abrir) await auditar(ator, 'LER', 'CanalChat', canal.id)
      return NextResponse.json(mensagens.reverse().map(apresentar))
    }

    const email = params.get('para')?.trim().toLowerCase()
    if (!email || email.length > 254) return NextResponse.json({ error: 'Destinatário obrigatório' }, { status: 400 })
    const contato = await prisma.usuario.findFirst({ where: { hospitalId: ator.hospitalId, email, ativo: true }, select: { id: true } })
    if (!contato) return NextResponse.json({ error: 'Destinatário não encontrado neste hospital' }, { status: 404 })
    if (contato.id === ator.id) return NextResponse.json({ error: 'Não é possível abrir conversa consigo mesmo' }, { status: 400 })

    const mensagens = await prisma.mensagemChat.findMany({
      where: {
        hospitalId: ator.hospitalId,
        canalId: null,
        ...filtroData,
        OR: [
          { senderId: ator.id, recipientId: contato.id },
          { senderId: contato.id, recipientId: ator.id },
        ],
      },
      orderBy: { dataHora: 'desc' },
      take: PAGINA,
      select: CAMPOS,
    })
    await prisma.mensagemChat.updateMany({
      where: { hospitalId: ator.hospitalId, senderId: contato.id, recipientId: ator.id, lidaEm: null },
      data: { lidaEm: new Date() },
    })
    if (abrir) await auditar(ator, 'LER', 'ConversaChat', contato.id)
    return NextResponse.json(mensagens.reverse().map(apresentar))
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  const texto = typeof body?.texto === 'string' ? body.texto.trim() : ''
  const para = typeof body?.para === 'string' ? body.para.trim().toLowerCase() : ''
  const canal = typeof body?.canal === 'string' ? body.canal.trim().toLowerCase() : ''
  if (!texto || texto.length > 4000 || (!para && !canal) || para.length > 254 || canal.length > 60) {
    return NextResponse.json({ error: 'Destinatário e mensagem válidos são obrigatórios' }, { status: 400 })
  }

  try {
    if (canal) {
      const c = await canalDoHospital(ator.hospitalId, canal)
      if (!c) return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 })
      const mensagem = await prisma.mensagemChat.create({
        data: { hospitalId: ator.hospitalId, senderId: ator.id, canalId: c.id, remetente: ator.nome, texto },
        select: CAMPOS,
      })
      await prisma.leituraCanal.upsert({
        where: { usuarioId_canalId: { usuarioId: ator.id, canalId: c.id } },
        update: { lidoAte: mensagem.dataHora },
        create: { usuarioId: ator.id, canalId: c.id, lidoAte: mensagem.dataHora },
      })
      return NextResponse.json(apresentar(mensagem), { status: 201 })
    }

    const contato = await prisma.usuario.findFirst({ where: { hospitalId: ator.hospitalId, email: para, ativo: true }, select: { id: true } })
    if (!contato) return NextResponse.json({ error: 'Destinatário não encontrado neste hospital' }, { status: 404 })
    if (contato.id === ator.id) return NextResponse.json({ error: 'Não é possível enviar mensagem para si mesmo' }, { status: 400 })

    const mensagem = await prisma.mensagemChat.create({
      data: { hospitalId: ator.hospitalId, senderId: ator.id, recipientId: contato.id, remetente: ator.nome, texto },
      select: CAMPOS,
    })
    return NextResponse.json(apresentar(mensagem), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
  }
}
