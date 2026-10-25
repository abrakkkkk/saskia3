import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TIPOS = new Set(['consulta', 'medicacao', 'exame', 'cirurgia', 'pessoal']);
const STATUS = new Set(['Pendente', 'Concluído']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return errorResponse('Não autorizado', 401);
    const { id: usuarioId, hospitalId, cargo } = session.user;
    if (!usuarioId || !hospitalId) return errorResponse('Hospital ou usuário não identificado', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400); }
    if (!isRecord(body)) return errorResponse('Dados inválidos', 400);

    const accessWhere = cargo === 'ADMIN' ? { id, hospitalId } : { id, hospitalId, criadoPorId: usuarioId };
    const lembrete = await prisma.lembrete.findFirst({ where: accessWhere });
    if (!lembrete) return errorResponse('Lembrete não encontrado', 404);

    const data: {
      titulo?: string;
      descricao?: string | null;
      dataHora?: Date;
      status?: string;
      tipo?: string;
      relacionado?: string | null;
      concluido?: boolean;
    } = {};

    if (body.titulo !== undefined) {
      if (typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.trim().length > 200) return errorResponse('Título inválido', 400);
      data.titulo = body.titulo.trim();
    }
    if (body.descricao !== undefined) {
      if (body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 4000)) return errorResponse('Descrição inválida', 400);
      data.descricao = body.descricao === '' ? null : body.descricao as string | null;
    }
    if (body.dataHora !== undefined || body.data !== undefined) {
      const value = body.dataHora ?? body.data;
      if (typeof value !== 'string' || !value.trim()) return errorResponse('Data inválida', 400);
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return errorResponse('Data inválida', 400);
      data.dataHora = parsed;
    }
    if (body.tipo !== undefined) {
      if (typeof body.tipo !== 'string' || !TIPOS.has(body.tipo)) return errorResponse('Tipo inválido', 400);
      data.tipo = body.tipo;
    }
    if (body.relacionado !== undefined) {
      if (body.relacionado !== null && (typeof body.relacionado !== 'string' || body.relacionado.length > 200)) return errorResponse('Campo relacionado inválido', 400);
      data.relacionado = body.relacionado === '' ? null : body.relacionado as string | null;
    }
    if (body.concluido !== undefined) {
      if (typeof body.concluido !== 'boolean') return errorResponse('Conclusão inválida', 400);
      data.concluido = body.concluido;
      data.status = body.concluido ? 'Concluído' : 'Pendente';
    }
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !STATUS.has(body.status)) return errorResponse('Status inválido', 400);
      data.status = body.status;
      if (body.concluido === undefined) data.concluido = body.status === 'Concluído';
    }
    if (Object.keys(data).length === 0) return errorResponse('Nenhuma alteração informada', 400);

    const atualizado = await prisma.lembrete.updateMany({ where: accessWhere, data });
    if (atualizado.count === 0) return errorResponse('Lembrete não encontrado', 404);
    return NextResponse.json(await prisma.lembrete.findFirst({ where: accessWhere }));
  } catch {
    return errorResponse('Erro ao atualizar lembrete', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return errorResponse('Não autorizado', 401);
    const { id: usuarioId, hospitalId, cargo } = session.user;
    if (!usuarioId || !hospitalId) return errorResponse('Hospital ou usuário não identificado', 403);

    const accessWhere = cargo === 'ADMIN' ? { id, hospitalId } : { id, hospitalId, criadoPorId: usuarioId };
    const removido = await prisma.lembrete.deleteMany({ where: accessWhere });
    if (removido.count === 0) return errorResponse('Lembrete não encontrado', 404);
    return NextResponse.json({ success: true });
  } catch {
    return errorResponse('Erro ao excluir lembrete', 500);
  }
}
