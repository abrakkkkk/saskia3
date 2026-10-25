import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (!session.user.hospitalId) {
      return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    }

    const data = await prisma.hospital.findMany({
      where: { id: session.user.hospitalId }
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar hospitais' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Criação de hospitais exige provisionamento autorizado' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar hospital' }, { status: 500 });
  }
}
