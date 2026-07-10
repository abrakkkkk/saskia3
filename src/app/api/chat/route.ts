import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    // Pegar as últimas 50 mensagens do hospital
    const mensagens = await prisma.mensagemChat.findMany({
      where: { hospitalId },
      orderBy: { dataHora: 'asc' },
      take: 50
    });

    return NextResponse.json(mensagens);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    const mensagem = await prisma.mensagemChat.create({
      data: {
        hospitalId,
        remetente: session.user.nome || 'Usuário',
        texto: body.texto,
      }
    });

    return NextResponse.json(mensagem, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
