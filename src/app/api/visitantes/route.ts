import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

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
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let data: unknown;
    try { data = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const { nome, documento, destino, pacienteId } = data as Record<string, unknown>;
    if (typeof nome !== 'string' || !nome.trim() || nome.length > 160 || (documento != null && (typeof documento !== 'string' || documento.length > 40)) || (destino != null && (typeof destino !== 'string' || destino.length > 160)) || (pacienteId != null && (typeof pacienteId !== 'string' || !pacienteId))) {
      return NextResponse.json({ error: 'Dados do visitante inválidos' }, { status: 400 });
    }
    if (typeof pacienteId === 'string') {
      const paciente = await prisma.paciente.findFirst({ where: { id: pacienteId, hospitalId }, select: { id: true } });
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado neste hospital' }, { status: 404 });
    }

    const novoVisitante = await prisma.visitante.create({
      data: {
        hospitalId,
        nome: nome.trim(),
        documento: typeof documento === 'string' ? documento.trim() || null : null,
        destino: typeof destino === 'string' ? destino.trim() || null : null,
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
