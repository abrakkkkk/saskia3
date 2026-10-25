import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas ADMIN ou usuários autorizados podem responder feedbacks
    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem responder feedbacks' }, { status: 403 });
    }

    const { id } = await params;
    const hospitalId = session.user.hospitalId;

    const feedbackExistente = await prisma.feedback.findFirst({
      where: { id, hospitalId }
    });

    if (!feedbackExistente) {
      return NextResponse.json({ error: 'Feedback não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { status, resposta } = body;

    const atualizado = await prisma.feedback.updateMany({
      where: { id, hospitalId },
      data: {
        status: status || 'RESPONDIDO',
        ...(resposta ? { mensagem: `${feedbackExistente.mensagem}\n\n[RESPOSTA DA EQUIPE]: ${resposta}` } : {})
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Feedback não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.feedback.findFirst({ where: { id, hospitalId } }));
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    return NextResponse.json({ error: 'Erro ao atualizar feedback' }, { status: 500 });
  }
}
