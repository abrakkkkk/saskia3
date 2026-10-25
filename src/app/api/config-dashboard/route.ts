import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isBooleanRecord } from '@/lib/request-validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const config = await prisma.configDashboard.findUnique({
      where: { hospitalId }
    });

    return NextResponse.json(config ? config.config : {});
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar configuração do dashboard' }, { status: 500 });
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
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!isBooleanRecord(body)) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 400 });
    }

    const config = await prisma.configDashboard.upsert({
      where: { hospitalId },
      update: { config: body },
      create: { hospitalId, config: body }
    });

    return NextResponse.json(config.config);
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar configuração do dashboard' }, { status: 500 });
  }
}
