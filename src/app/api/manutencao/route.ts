import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const ordens = await prisma.manutencaoOS.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(ordens);
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

    const ordem = await prisma.manutencaoOS.create({
      data: {
        hospitalId,
        equipamento: body.equipamento,
        setor: body.setor,
        tipo: body.tipo,
        prioridade: body.prioridade,
        solicitante: body.solicitante,
        data: body.data,
        descricao: body.descricao,
        status: 'Aberta'
      }
    });

    return NextResponse.json(ordem, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
