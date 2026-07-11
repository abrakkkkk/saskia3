import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const modelos = await prisma.modeloProntuario.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(modelos);
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    const modelo = await prisma.modeloProntuario.create({
      data: {
        hospitalId,
        titulo: body.titulo,
        descricao: body.descricao || '',
        campos: body.campos || []
      }
    });

    return NextResponse.json(modelo, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar modelo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
