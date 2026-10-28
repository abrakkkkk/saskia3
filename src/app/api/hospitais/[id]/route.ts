import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

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

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    if (!nome || nome.length > 160) return NextResponse.json({ error: 'Nome da instituição inválido' }, { status: 400 });
    const cnpj = typeof body.cnpj === 'string' ? body.cnpj.trim() : '';
    if (!cnpj || cnpj.length > 20) return NextResponse.json({ error: 'CNPJ da instituição inválido' }, { status: 400 });
    const optionalString = (value: unknown, max: number) => {
      if (value === undefined || value === null) return null;
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length <= max ? trimmed || null : undefined;
    };
    const endereco = optionalString(body.endereco, 300);
    const telefone = optionalString(body.telefone, 40);
    const logo = optionalString(body.logoUrl, 2048);
    if (endereco === undefined || telefone === undefined || logo === undefined) return NextResponse.json({ error: 'Dados da instituição excedem os limites permitidos' }, { status: 400 });

    const hospital = await prisma.hospital.update({
      where: { id: session.user.hospitalId },
      data: {
        nome,
        cnpj,
        endereco,
        telefone,
        logo,
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
