import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;

    const visitantes = await prisma.visitante.findMany({
      where: { hospitalId },
      orderBy: { entrada: 'desc' },
      include: {
        paciente: {
          select: { nome: true }
        }
      }
    });

    return NextResponse.json(visitantes);
  } catch (error: any) {
    console.error('Erro ao buscar visitantes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const data = await request.json();
    const { nome, documento, destino, pacienteId } = data;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do visitante é obrigatório' }, { status: 400 });
    }

    const novoVisitante = await prisma.visitante.create({
      data: {
        hospitalId: session.user.hospitalId,
        nome,
        documento,
        destino,
        pacienteId: pacienteId || null,
        status: 'DENTRO'
      }
    });

    return NextResponse.json(novoVisitante, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar visitante:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
