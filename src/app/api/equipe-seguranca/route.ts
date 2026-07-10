import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const ocorrencias = await prisma.ocorrenciaSeguranca.findMany({
      where: { hospitalId },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(ocorrencias);
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

    const ocorrencia = await prisma.ocorrenciaSeguranca.create({
      data: {
        hospitalId,
        tipo: body.tipo,
        local: body.local,
        relato: body.relato,
        vigilante: body.vigilante,
        dataHora: new Date(body.dataHora)
      }
    });

    return NextResponse.json(ocorrencia, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
