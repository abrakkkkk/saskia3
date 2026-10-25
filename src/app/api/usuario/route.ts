import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Rota legada protegida contra acesso não autenticado (RBAC + Multi-tenancy)
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    }

    const data = await prisma.usuario.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        hospital: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas ADMIN pode cadastrar novos usuários neste endpoint
    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    }
    const body = await request.json();
    const cargosPermitidos = ['ADMIN', 'MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM', 'RECEPCIONISTA', 'FARMACEUTICO', 'OUTROS'];
    if (typeof body.nome !== 'string' || !body.nome.trim() || typeof body.email !== 'string' || !body.email.trim() || typeof body.senha !== 'string' || body.senha.length < 12) {
      return NextResponse.json({ error: 'Nome, e-mail e senha com pelo menos 12 caracteres são obrigatórios' }, { status: 400 });
    }
    if (!cargosPermitidos.includes(body.cargo)) {
      return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 });
    }

    const senhaHash = await bcrypt.hash(body.senha, 12);
    
    const data = await prisma.usuario.create({
      data: {
        nome: body.nome.trim(),
        email: body.email.trim().toLowerCase(),
        senha: senhaHash,
        cargo: body.cargo,
        hospitalId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
