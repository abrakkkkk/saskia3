import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const quantidade = (body as Record<string, unknown>).quantidade;
    if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 0) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    const bolsa = await prisma.estoqueSangue.findFirst({
      where: { id: id, hospitalId }
    });

    if (!bolsa) {
      return NextResponse.json({ error: 'Estoque não encontrado' }, { status: 404 });
    }

    const novaQuantidade = quantidade;

    const atualizado = await prisma.estoqueSangue.updateMany({
      where: { id, hospitalId },
      data: {
        quantidade: novaQuantidade,
        status: novaQuantidade < 5 ? 'CRÍTICO' : (novaQuantidade < 15 ? 'ALERTA' : 'NORMAL')
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Estoque não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.estoqueSangue.findFirst({ where: { id, hospitalId } }));
  } catch (error: any) {
    console.error("Erro ao atualizar banco de sangue:", error);
    return NextResponse.json({ error: 'Erro ao atualizar banco de sangue' }, { status: 500 });
  }
}
