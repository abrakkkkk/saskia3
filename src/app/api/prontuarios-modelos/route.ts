import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TIPOS_CAMPO = new Set(['texto', 'numero', 'data', 'textarea', 'select']);
const MAX_CAMPOS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCampos(value: unknown): { campos?: Array<{ id?: string; nome: string; tipo: string }>; error?: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CAMPOS) return { error: 'Adicione de 1 a 100 campos válidos' };
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const modelos = await prisma.modeloProntuario.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(modelos, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return NextResponse.json({ error: 'Erro ao buscar modelos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
    if (!isRecord(body) || typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.trim().length > 160 || (body.descricao !== undefined && (typeof body.descricao !== 'string' || body.descricao.length > 2000))) {
      return NextResponse.json({ error: 'Título ou descrição inválidos' }, { status: 400 });
    }
    const parsed = parseCampos(body.campos);
    if (parsed.error || !parsed.campos) return NextResponse.json({ error: parsed.error || 'Campos inválidos' }, { status: 400 });

    const modelo = await prisma.modeloProntuario.create({
      data: {
        hospitalId,
        titulo: body.titulo.trim(),
        descricao: typeof body.descricao === 'string' ? body.descricao.trim() : '',
        campos: parsed.campos
      }
    });

    return NextResponse.json(modelo, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    console.error('Erro ao criar modelo:', error);
    return NextResponse.json({ error: 'Erro ao criar modelo' }, { status: 500 });
  }
}
