import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;

    const lembretes = await prisma.lembrete.findMany({
      where: { hospitalId },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(lembretes);
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

    const lembrete = await prisma.lembrete.create({
      data: {
        hospitalId,
        titulo: body.titulo,
        descricao: body.descricao,
        dataHora: new Date(body.dataHora || body.data),
        tipo: body.tipo || 'consulta',
        relacionado: body.relacionado || null,
        criadoPor: body.criadoPor || 'Usuário',
        concluido: body.concluido || false
      }
    });

    return NextResponse.json(lembrete, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
