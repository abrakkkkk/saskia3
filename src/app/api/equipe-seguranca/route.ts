import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const ocorrencias = await prisma.ocorrenciaSeguranca.findMany({
      where: { hospitalId },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(ocorrencias);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
