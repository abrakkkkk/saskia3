import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospital = await prisma.hospital.findUnique({
      where: { id }
    });

    if (!hospital) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(hospital);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { nome, cnpj, endereco, telefone, logoUrl } = body;

    const hospital = await prisma.hospital.update({
      where: { id },
      data: { nome, cnpj, endereco, telefone, logo: logoUrl } // model is 'logo', page is 'logoUrl'
    });

    return NextResponse.json(hospital);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
