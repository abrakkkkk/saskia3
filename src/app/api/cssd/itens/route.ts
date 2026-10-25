import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

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
    if (
      typeof body.loteId !== 'string' || !body.loteId ||
      typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 200 ||
      typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 100 ||
      typeof body.embalagem !== 'string' || !body.embalagem.trim() || body.embalagem.length > 100 ||
      typeof body.integridade !== 'string' || !body.integridade.trim() || body.integridade.length > 100 ||
      (body.quantidade !== undefined && (!Number.isInteger(body.quantidade) || (body.quantidade as number) < 1 || (body.quantidade as number) > 100000))
    ) return NextResponse.json({ error: 'Dados do item inválidos' }, { status: 400 });

    const lote = await prisma.cssdLote.findFirst({
      where: { id: body.loteId, hospitalId }
    });

    if (!lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const item = await prisma.cssdItem.create({
      data: {
        loteId: body.loteId,
        nome: body.nome.trim(),
        tipo: body.tipo.trim(),
        quantidade: typeof body.quantidade === 'number' ? body.quantidade : 1,
        embalagem: body.embalagem.trim(),
        integridade: body.integridade.trim()
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar item' }, { status: 500 });
  }
}
