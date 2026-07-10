import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const obitos = await prisma.obito.findMany({
      where: { hospitalId },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(obitos);
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

    const obito = await prisma.obito.create({
      data: {
        hospitalId,
        pacienteNome: body.pacienteNome,
        dataHora: new Date(body.dataHora),
        medicoCrm: body.medicoCrm,
        causaBasi: body.causaBasi
      }
    });

    return NextResponse.json(obito, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
