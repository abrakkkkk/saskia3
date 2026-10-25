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
    
    const lotes = await prisma.cssdLote.findMany({
      where: { hospitalId },
      include: {
        itens: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(lotes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar lotes de esterilização' }, { status: 500 });
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
    const required = ['numero', 'setor', 'data', 'equipamento', 'ciclo', 'indicadorQuimico', 'indicadorBiologico', 'bowieDick'];
    if (required.some((key) => typeof body[key] !== 'string' || !(body[key] as string).trim() || (body[key] as string).length > 200)) {
      return NextResponse.json({ error: 'Preencha corretamente os campos obrigatórios do lote' }, { status: 400 });
    }

    const lote = await prisma.cssdLote.create({
      data: {
        hospitalId,
        numero: (body.numero as string).trim(),
        setor: (body.setor as string).trim(),
        operador: session.user.name || 'Profissional autenticado',
        data: (body.data as string).trim(),
        equipamento: (body.equipamento as string).trim(),
        ciclo: (body.ciclo as string).trim(),
        indicadorQuimico: (body.indicadorQuimico as string).trim(),
        indicadorBiologico: (body.indicadorBiologico as string).trim(),
        bowieDick: (body.bowieDick as string).trim(),
        obs: typeof body.obs === 'string' ? body.obs.slice(0, 2000) : null,
        status: 'Recepção'
      },
      include: {
        itens: true
      }
    });

    return NextResponse.json(lote, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar lote de esterilização' }, { status: 500 });
  }
}
