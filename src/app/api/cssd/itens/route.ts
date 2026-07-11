import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    const lote = await prisma.cssdLote.findFirst({
      where: { id: body.loteId, hospitalId }
    });

    if (!lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const item = await prisma.cssdItem.create({
      data: {
        loteId: body.loteId,
        nome: body.nome,
        tipo: body.tipo,
        quantidade: body.quantidade,
        embalagem: body.embalagem,
        integridade: body.integridade
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
