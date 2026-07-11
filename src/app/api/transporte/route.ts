import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const transportes = await prisma.transportePaciente.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transportes);
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

    const transporte = await prisma.transportePaciente.create({
      data: {
        hospitalId,
        paciente: body.paciente,
        origem: body.origem,
        destino: body.destino,
        tipo: body.tipo,
        solicitante: body.solicitante,
        data: body.data,
        status: body.status || 'Pendente'
      }
    });

    return NextResponse.json(transporte, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
