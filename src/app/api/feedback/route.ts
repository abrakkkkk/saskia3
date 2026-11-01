import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

const TIPOS_FEEDBACK = new Set(['SUGESTAO', 'ELOGIO', 'RECLAMACAO', 'BUG']);

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hospitalId = session.user.hospitalId;
    const usuarioId = session.user.id;
    if (!hospitalId || !usuarioId) {
      return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    }

    const data = await prisma.feedback.findMany({
      where: { hospitalId, ...(session.user.cargo === 'ADMIN' ? {} : { usuarioId }) },
      select: {
        id: true,
        tipo: true,
        mensagem: true,
        status: true,
        createdAt: true,
        usuario: {
          select: {
            nome: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
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

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!isRecord(body) || typeof body.mensagem !== 'string' || !body.mensagem.trim() || body.mensagem.length > 4000 || (body.tipo !== undefined && (typeof body.tipo !== 'string' || !TIPOS_FEEDBACK.has(body.tipo)))) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const data = await prisma.feedback.create({
      data: {
        hospitalId,
        usuarioId,
        tipo: typeof body.tipo === 'string' ? body.tipo : 'SUGESTAO',
        mensagem: body.mensagem.trim(),
        status: 'NOVO'
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
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
