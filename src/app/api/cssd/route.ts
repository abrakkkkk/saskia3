import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const lotes = await prisma.cssdLote.findMany({
      where: { hospitalId },
      include: {
        itens: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(lotes);
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

    const lote = await prisma.cssdLote.create({
      data: {
        hospitalId,
        numero: body.numero,
        setor: body.setor,
        operador: body.operador,
        data: body.data,
        equipamento: body.equipamento,
        ciclo: body.ciclo,
        indicadorQuimico: body.indicadorQuimico,
        indicadorBiologico: body.indicadorBiologico,
        bowieDick: body.bowieDick,
        obs: body.obs,
        status: 'Recepção'
      },
      include: {
        itens: true
      }
    });

    return NextResponse.json(lote, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
