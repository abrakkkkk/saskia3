import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const estoque = await prisma.estoqueSangue.findMany({
      where: { hospitalId },
      orderBy: { tipo: 'asc' }
    });

    return NextResponse.json(estoque);
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

    const bolsa = await prisma.estoqueSangue.create({
      data: {
        hospitalId,
        tipo: body.tipo,
        quantidade: parseInt(body.quantidade),
        status: parseInt(body.quantidade) < 5 ? 'CRÍTICO' : 'NORMAL'
      }
    });

    return NextResponse.json(bolsa, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
