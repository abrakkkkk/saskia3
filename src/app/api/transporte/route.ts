import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    
    const transportes = await prisma.transportePaciente.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transportes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar transportes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const required = ['paciente', 'origem', 'destino', 'tipo', 'data'];
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    if (required.some(key => typeof body[key] !== 'string' || !(body[key] as string).trim() || (body[key] as string).length > 200)) {
      return NextResponse.json({ error: 'Preencha os dados obrigatórios do transporte' }, { status: 400 });
    }

    const transporte = await prisma.transportePaciente.create({
      data: {
        hospitalId,
        paciente: (body.paciente as string).trim(),
        origem: (body.origem as string).trim(),
        destino: (body.destino as string).trim(),
        tipo: (body.tipo as string).trim(),
        solicitante: session.user.name || session.user.email || 'Profissional autenticado',
        data: (body.data as string).trim(),
        status: 'Pendente'
      }
    });

    return NextResponse.json(transporte, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar transporte' }, { status: 500 });
  }
}
