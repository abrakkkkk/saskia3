import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const hospitalId = session.user.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

  try {
    const contacts = await prisma.usuario.findMany({
      where: { hospitalId, ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, cargo: true },
    });
    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar contatos' }, { status: 500 });
  }
}
