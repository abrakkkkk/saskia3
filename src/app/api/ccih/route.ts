import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // IRAS, CULTURA, HM, ATM

    const registros = await prisma.ccihRegistro.findMany({
      where: {
        hospitalId,
        ...(tipo ? { tipo } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(registros);
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

    const registro = await prisma.ccihRegistro.create({
      data: {
        hospitalId,
        tipo: body.tipo,
        subtipo: body.subtipo || null,
        descricao: body.descricao || null,
        dados: body.dados || null,
        data: new Date(body.data || new Date()),
        status: body.status || 'ATIVO',
        criadoPor: body.criadoPor || session.user.name || 'Sistema'
      }
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
