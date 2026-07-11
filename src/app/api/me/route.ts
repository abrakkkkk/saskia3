import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    include: { hospital: { select: { nome: true } } },
  });

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  return NextResponse.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cargo: usuario.cargo,
    avatar: usuario.avatar,
    hospital: usuario.hospital,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { nome, avatar, senhaAtual, novaSenha } = body;

  // Verificar senha atual se for alterar
  if (novaSenha) {
    if (!senhaAtual) return NextResponse.json({ error: 'Informe a senha atual para alterá-la.' }, { status: 400 });
    const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id } });
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    let senhaValida = false;
    if (usuario.senha.startsWith('$2')) {
      senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    } else {
      senhaValida = senhaAtual === usuario.senha;
    }
    if (!senhaValida) return NextResponse.json({ error: 'Senha atual incorreta!' }, { status: 400 });
  }

  const updateData: any = {};
  if (nome) updateData.nome = nome;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (novaSenha) updateData.senha = await bcrypt.hash(novaSenha, 10);

  const atualizado = await prisma.usuario.update({
    where: { id: session.user.id },
    data: updateData,
    include: { hospital: { select: { nome: true } } },
  });

  return NextResponse.json({
    id: atualizado.id,
    nome: atualizado.nome,
    email: atualizado.email,
    cargo: atualizado.cargo,
    avatar: atualizado.avatar,
    hospital: atualizado.hospital,
  });
}
