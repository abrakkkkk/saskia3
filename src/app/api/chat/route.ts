import { NextRequest, NextResponse } from 'next/server'
import { exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const PAGINA = 200
const CAMPOS = {
  id: true, texto: true, dataHora: true,
  sender: { select: { email: true } },
  recipient: { select: { email: true } },
} as const

type Registro = { id: string; texto: string; dataHora: Date; sender: { email: string } | null; recipient: { email: string } | null }
const apresentar = (m: Registro) => ({ id: m.id, de: m.sender?.email, para: m.recipient?.email, texto: m.texto, data: m.dataHora })

export async function GET(request: NextRequest) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const params = request.nextUrl.searchParams
  const email = params.get('para')?.trim().toLowerCase()
  if (!email || email.length > 254) return NextResponse.json({ error: 'Destinatário obrigatório' }, { status: 400 })
  const antes = params.get('antes')
  const limite = antes ? new Date(antes) : null
  if (limite && Number.isNaN(limite.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })

  try {
    const contato = await prisma.usuario.findFirst({ where: { hospitalId: ator.hospitalId, email, ativo: true }, select: { id: true } })
    if (!contato) return NextResponse.json({ error: 'Destinatário não encontrado neste hospital' }, { status: 404 })
    if (contato.id === ator.id) return NextResponse.json({ error: 'Não é possível abrir conversa consigo mesmo' }, { status: 400 })

    const mensagens = await prisma.mensagemChat.findMany({
      where: {
        hospitalId: ator.hospitalId,
        ...(limite ? { dataHora: { lt: limite } } : {}),
        OR: [
          { senderId: ator.id, recipientId: contato.id },
          { senderId: contato.id, recipientId: ator.id },
        ],
      },
      orderBy: { dataHora: 'desc' },
      take: PAGINA,
      select: CAMPOS,
    })
    return NextResponse.json(mensagens.reverse().map(apresentar))
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body || typeof body.para !== 'string' || !body.para.trim() || body.para.length > 254
    || typeof body.texto !== 'string' || !body.texto.trim() || body.texto.length > 4000) {
    return NextResponse.json({ error: 'Destinatário e mensagem válidos são obrigatórios' }, { status: 400 })
  }

  try {
    const contato = await prisma.usuario.findFirst({
      where: { hospitalId: ator.hospitalId, email: body.para.trim().toLowerCase(), ativo: true },
      select: { id: true },
    })
    if (!contato) return NextResponse.json({ error: 'Destinatário não encontrado neste hospital' }, { status: 404 })
    if (contato.id === ator.id) return NextResponse.json({ error: 'Não é possível enviar mensagem para si mesmo' }, { status: 400 })

    const mensagem = await prisma.mensagemChat.create({
      data: {
        hospitalId: ator.hospitalId,
        senderId: ator.id,
        recipientId: contato.id,
        remetente: ator.nome,
        texto: body.texto.trim(),
      },
      select: CAMPOS,
    })
    return NextResponse.json(apresentar(mensagem), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
  }
}
