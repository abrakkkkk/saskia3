import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;

    const categorias = await prisma.categoria.findMany({
      where: { hospitalId },
      orderBy: { nome: 'asc' }
    });

    return NextResponse.json(categorias);
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

    const categoria = await prisma.categoria.create({
      data: {
        hospitalId,
        nome: body.nome,
        tipo: body.tipo || "PRODUTO",
        descricao: body.descricao || ""
      }
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
