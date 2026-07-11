import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const config = await prisma.configDashboard.findUnique({
      where: { hospitalId }
    });

    return NextResponse.json(config ? config.config : {});
  } catch (error) {
    console.error('Erro ao buscar config do dashboard:', error);
    return NextResponse.json({});
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    const config = await prisma.configDashboard.upsert({
      where: { hospitalId },
      update: { config: body },
      create: { hospitalId, config: body }
    });

    return NextResponse.json(config.config);
  } catch (error: any) {
    console.error('Erro ao salvar config do dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
