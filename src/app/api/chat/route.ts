import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId || !session.user.id || !session.user.email) return NextResponse.json({ error: 'Identidade ou hospital não identificado' }, { status: 403 });
  const peerEmail = request.nextUrl.searchParams.get('para')?.trim().toLowerCase();
  if (!peerEmail || peerEmail.length > 254) return NextResponse.json({ error: 'Destinatário obrigatório' }, { status: 400 });

  try {
    const recipient = await prisma.usuario.findFirst({
      where: { hospitalId, email: peerEmail, ativo: true },
      select: { id: true, email: true },
    });
    if (!recipient) return NextResponse.json({ error: 'Destinatário não encontrado neste hospital' }, { status: 404 });
    if (recipient.id === session.user.id) return NextResponse.json({ error: 'Não é possível abrir conversa consigo mesmo' }, { status: 400 });

    const mensagens = await prisma.mensagemChat.findMany({
      where: {
        hospitalId,
        OR: [
          { senderId: session.user.id, recipientId: recipient.id },
          { senderId: recipient.id, recipientId: session.user.id },
        ],
      },
      orderBy: { dataHora: 'desc' },
      take: 200,
      select: {
        id: true, texto: true, dataHora: true,
        sender: { select: { email: true } },
        recipient: { select: { email: true } },
      },
    });
    return NextResponse.json(mensagens.reverse().map((message) => ({
      id: message.id,
      de: message.sender?.email,
      para: message.recipient?.email,
      texto: message.texto,
      data: message.dataHora,
    })));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId || !session.user.id || !session.user.email) return NextResponse.json({ error: 'Identidade ou hospital não identificado' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const payload = body as Record<string, unknown>;
  if (typeof payload.para !== 'string' || !payload.para.trim() || payload.para.length > 254 || typeof payload.texto !== 'string' || !payload.texto.trim() || payload.texto.length > 4000) {
    return NextResponse.json({ error: 'Destinatário e mensagem válidos são obrigatórios' }, { status: 400 });
  }

  try {
    const recipient = await prisma.usuario.findFirst({
      where: { hospitalId, email: payload.para.trim().toLowerCase(), ativo: true },
      select: { id: true },
    });
    if (!recipient) return NextResponse.json({ error: 'Destinatário não encontrado neste hospital' }, { status: 404 });
    if (recipient.id === session.user.id) return NextResponse.json({ error: 'Não é possível enviar mensagem para si mesmo' }, { status: 400 });

    const message = await prisma.mensagemChat.create({
      data: {
        hospitalId,
        senderId: session.user.id,
        recipientId: recipient.id,
        remetente: session.user.name || session.user.email,
        texto: payload.texto.trim(),
      },
      select: {
        id: true, texto: true, dataHora: true,
        sender: { select: { email: true } },
        recipient: { select: { email: true } },
      },
    });
    return NextResponse.json({ id: message.id, de: message.sender?.email, para: message.recipient?.email, texto: message.texto, data: message.dataHora }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}
