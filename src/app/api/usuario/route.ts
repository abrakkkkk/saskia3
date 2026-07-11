import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const data = await prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' },
      include: { hospital: true }
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Hash senha if present
    if (body.senha && !body.senha.startsWith('$2')) {
       body.senha = await bcrypt.hash(body.senha, 10);
    }
    
    const data = await prisma.usuario.create({
      data: body
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar dado' }, { status: 500 });
  }
}
