import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TIPOS_CAMPO = new Set(['texto', 'numero', 'data', 'textarea', 'select']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCampos(value: unknown): { campos?: Array<{ id?: string; nome: string; tipo: string }>; error?: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return { error: 'Adicione de 1 a 100 campos válidos' };
  const campos: Array<{ id?: string; nome: string; tipo: string }> = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.nome !== 'string' || !item.nome.trim() || item.nome.trim().length > 120 || typeof item.tipo !== 'string' || !TIPOS_CAMPO.has(item.tipo)) {
      return { error: 'Um ou mais campos do modelo são inválidos' };
    }
    const campo: { id?: string; nome: string; tipo: string } = { nome: item.nome.trim(), tipo: item.tipo };
    if (typeof item.id === 'string' && item.id.length <= 64) campo.id = item.id;
    campos.push(campo);
  }
  return { campos };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
    if (!isRecord(body) || Object.keys(body).some(key => !['titulo', 'descricao', 'campos'].includes(key)) || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    if (body.titulo !== undefined && (typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.trim().length > 160)) {
      return NextResponse.json({ error: 'Título inválido' }, { status: 400 });
    }
    if (body.descricao !== undefined && (typeof body.descricao !== 'string' || body.descricao.length > 2000)) {
      return NextResponse.json({ error: 'Descrição inválida' }, { status: 400 });
    }
    const parsed = body.campos === undefined ? undefined : parseCampos(body.campos);
    if (parsed?.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const modelo = await prisma.modeloProntuario.findFirst({
      where: { id, hospitalId }
    });
    if (!modelo) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const atualizado = await prisma.modeloProntuario.updateMany({
      where: { id, hospitalId },
      data: {
        ...(body.titulo !== undefined ? { titulo: (body.titulo as string).trim() } : {}),
        ...(body.descricao !== undefined ? { descricao: (body.descricao as string).trim() } : {}),
        ...(parsed?.campos ? { campos: parsed.campos } : {})
      }
    });

    if (atualizado.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(await prisma.modeloProntuario.findFirst({ where: { id, hospitalId } }));
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar modelo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const modelo = await prisma.modeloProntuario.findFirst({
      where: { id, hospitalId }
    });
    if (!modelo) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const removido = await prisma.modeloProntuario.deleteMany({ where: { id, hospitalId } });
    if (removido.count === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir modelo' }, { status: 500 });
  }
}
