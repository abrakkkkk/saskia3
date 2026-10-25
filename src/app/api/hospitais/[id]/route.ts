import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    if (!session.user.hospitalId || id !== session.user.hospitalId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: session.user.hospitalId }
    });

    if (!hospital) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(hospital);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados do hospital' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    if (!session.user.hospitalId || id !== session.user.hospitalId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    if (!nome) return NextResponse.json({ error: 'Nome da instituição é obrigatório' }, { status: 400 });
    const cnpj = typeof body.cnpj === 'string' ? body.cnpj.trim() : '';
    if (!cnpj) return NextResponse.json({ error: 'CNPJ da instituição é obrigatório' }, { status: 400 });
    const optionalString = (value: unknown) =>
      typeof value === 'string' ? value.trim() || null : null;

    const hospital = await prisma.hospital.update({
      where: { id: session.user.hospitalId },
      data: {
        nome,
        cnpj,
        endereco: optionalString(body.endereco),
        telefone: optionalString(body.telefone),
        logo: optionalString(body.logoUrl),
      }
    });

    return NextResponse.json(hospital);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este CNPJ já está cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao salvar os dados do hospital' }, { status: 500 });
  }
}
