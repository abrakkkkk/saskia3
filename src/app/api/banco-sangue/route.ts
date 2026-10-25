import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const grupos = await prisma.estoqueSangue.groupBy({
      by: ['tipo'],
      where: { hospitalId },
      _sum: { quantidade: true },
    });
    const estoque = grupos.map(item => {
      const quantidade = item._sum.quantidade ?? 0
      return { id: item.tipo, tipo: item.tipo, quantidade, status: quantidade < 5 ? 'CRÍTICO' : quantidade < 15 ? 'ALERTA' : 'NORMAL' }
    }).sort((a, b) => a.tipo.localeCompare(b.tipo))

    return NextResponse.json(estoque);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const input = body as Record<string, unknown>;
    const quantidade = input.quantidade;
    const tiposPermitidos = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
    if (typeof input.tipo !== 'string' || !tiposPermitidos.has(input.tipo) || typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 0) {
      return NextResponse.json({ error: 'Tipo sanguíneo ou quantidade inválida' }, { status: 400 });
    }

    const bolsa = await prisma.$transaction(async tx => {
      const existing = await tx.estoqueSangue.findFirst({ where: { hospitalId, tipo: input.tipo as string }, orderBy: { createdAt: 'asc' } })
      const total = (existing?.quantidade ?? 0) + quantidade
      const status = total < 5 ? 'CRÍTICO' : total < 15 ? 'ALERTA' : 'NORMAL'
      if (existing) {
        await tx.estoqueSangue.updateMany({ where: { id: existing.id, hospitalId }, data: { quantidade: total, status } })
        return tx.estoqueSangue.findFirst({ where: { id: existing.id, hospitalId } })
      }
      return tx.estoqueSangue.create({ data: { hospitalId, tipo: input.tipo as string, quantidade: total, status } })
    });

    return NextResponse.json(bolsa, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
