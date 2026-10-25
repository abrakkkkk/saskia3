import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    }

    const data = await prisma.feedback.findMany({
      where: { hospitalId },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    return NextResponse.json({ error: 'Erro ao buscar feedbacks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hospitalId = session.user.hospitalId;
    const usuarioId = session.user.id;
    if (!hospitalId || !usuarioId) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 403 });
    }

    const body = await request.json();
    const { tipo, mensagem } = body;

    if (!mensagem || !mensagem.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const data = await prisma.feedback.create({
      data: {
        hospitalId,
        usuarioId,
        tipo: tipo || 'SUGESTAO',
        mensagem: mensagem.trim(),
        status: 'NOVO'
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true
          }
        }
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar feedback:', error);
    return NextResponse.json({ error: 'Erro ao criar feedback' }, { status: 500 });
  }
}