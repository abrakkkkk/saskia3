import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TIPOS = new Set(['Elogio', 'Sugestão', 'Reclamação', 'Denúncia']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { id: usuarioId, hospitalId, cargo } = session.user;
    if (!usuarioId || !hospitalId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });

    const tickets = await prisma.ouvidoriaTicket.findMany({
      where: cargo === 'ADMIN' ? { hospitalId } : { hospitalId, autorId: usuarioId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tickets);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar manifestações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { id: usuarioId, hospitalId } = session.user;
    if (!usuarioId || !hospitalId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const tipo = typeof body.tipo === 'string' ? body.tipo : '';
    const setor = typeof body.setor === 'string' ? body.setor.trim() : '';
    const paciente = typeof body.paciente === 'string' ? body.paciente.trim() : '';
    const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim() : '';
    if (!TIPOS.has(tipo) || !setor || setor.length > 120 || !paciente || paciente.length > 200 || !mensagem || mensagem.length > 5000) {
      return NextResponse.json({ error: 'Tipo, setor, identificação e descrição válidos são obrigatórios' }, { status: 400 });
    }

    const anoMes = new Date().toISOString().slice(0, 7).replace('-', '');
    const protocolo = `OUV-${anoMes}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const ticket = await prisma.ouvidoriaTicket.create({
      data: {
        hospitalId,
        autorId: usuarioId,
        protocolo,
        tipo,
        setor,
        paciente,
        mensagem,
        status: 'ABERTO',
        prazo: '-'
      }
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar manifestação' }, { status: 500 });
  }
}
