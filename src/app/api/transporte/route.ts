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
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    if (typeof body.pacienteId !== 'string' || !body.pacienteId.trim() || body.pacienteId.length > 64 ||
      ['origem', 'destino', 'tipo', 'data'].some(key => typeof body[key] !== 'string' || !(body[key] as string).trim() || (body[key] as string).length > 200) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.data as string)) {
      return NextResponse.json({ error: 'Preencha os dados obrigatórios do transporte' }, { status: 400 });
    }

    const [data, hora] = (body.data as string).split('T');
    const inicio = new Date(`${data}T${hora}:00`);
    if (Number.isNaN(inicio.getTime()) || inicio.getFullYear() !== Number(data.slice(0, 4)) ||
      inicio.getMonth() + 1 !== Number(data.slice(5, 7)) || inicio.getDate() !== Number(data.slice(8, 10)) ||
      inicio.getHours() !== Number(hora.slice(0, 2)) || inicio.getMinutes() !== Number(hora.slice(3, 5))) {
      return NextResponse.json({ error: 'Data e hora inválidas' }, { status: 400 });
    }
    const paciente = await prisma.paciente.findFirst({
      where: { id: body.pacienteId.trim(), hospitalId, arquivadoEm: null },
      select: { id: true, nome: true },
    });
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 });

    const transporte = await prisma.transportePaciente.create({
      data: {
        hospitalId,
        paciente: paciente.nome,
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
