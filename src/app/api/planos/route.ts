import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    
    const operadoras = await prisma.operadoraPlano.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(operadoras);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar operadoras' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

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
      typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 150 ||
      typeof body.codigoAns !== 'string' || !body.codigoAns.trim() || body.codigoAns.length > 30 ||
      typeof body.vigencia !== 'string' || !body.vigencia.trim() || body.vigencia.length > 100 ||
      typeof body.teto !== 'string' || !body.teto.trim() || body.teto.length > 100 ||
      (body.status !== undefined && (typeof body.status !== 'string' || !['ATIVO', 'INATIVO'].includes(body.status)))
    ) return NextResponse.json({ error: 'Dados da operadora inválidos' }, { status: 400 });

    const operadora = await prisma.operadoraPlano.create({
      data: {
        hospitalId,
        nome: body.nome.trim(),
        codigoAns: body.codigoAns.trim(),
        vigencia: body.vigencia.trim(),
        status: typeof body.status === 'string' ? body.status : 'ATIVO',
        teto: body.teto.trim()
      }
    });

    return NextResponse.json(operadora, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar operadora' }, { status: 500 });
  }
}
