import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    
    const obitos = await prisma.obito.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(obitos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar registros de óbito' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const input = body as Record<string, unknown>;
    const stringFields = ['nome', 'nascimento', 'cpf', 'sexo', 'data', 'hora', 'local', 'causa', 'causaSec', 'medico', 'prontuario', 'responsavel', 'telefone', 'observacoes'];
    if (stringFields.some((key) => input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') ||
      typeof input.nome !== 'string' || !input.nome.trim() || input.nome.length > 160 ||
      typeof input.data !== 'string' || !input.data.trim() || input.data.length > 40 ||
      typeof input.hora !== 'string' || !input.hora.trim() || input.hora.length > 20 ||
      typeof input.causa !== 'string' || !input.causa.trim() || input.causa.length > 1000 ||
      typeof input.medico !== 'string' || !input.medico.trim() || input.medico.length > 160 ||
      (input.cpf != null && input.cpf !== '' && (input.cpf as string).length > 20) ||
      (input.certidaoEmitida !== undefined && typeof input.certidaoEmitida !== 'boolean') ||
      Object.entries({ nascimento: 40, cpf: 20, sexo: 40, local: 160, causaSec: 1000, prontuario: 100, responsavel: 160, telefone: 40, observacoes: 4000 }).some(([key, max]) => typeof input[key] === 'string' && (input[key] as string).length > max)) {
      return NextResponse.json({ error: 'Dados do óbito inválidos' }, { status: 400 });
    }
    const optional = (key: string, max: number) => typeof input[key] === 'string' ? (input[key] as string).trim().slice(0, max) || null : null;

    const obito = await prisma.$transaction(async (tx) => {
      const created = await tx.obito.create({ data: {
        hospitalId,
        nome: (input.nome as string).trim(), nascimento: optional('nascimento', 40), cpf: optional('cpf', 20),
        sexo: optional('sexo', 40), data: (input.data as string).trim(), hora: (input.hora as string).trim(),
        local: optional('local', 160), causa: (input.causa as string).trim(), causaSec: optional('causaSec', 1000),
        medico: (input.medico as string).trim(), prontuario: optional('prontuario', 100), responsavel: optional('responsavel', 160),
        telefone: optional('telefone', 40), observacoes: optional('observacoes', 4000),
        registradoPor: session.user.name || session.user.email || null,
        dataRegistro: new Date().toISOString(), certidaoEmitida: input.certidaoEmitida === true,
      } });
      if (typeof input.cpf === 'string' && input.cpf.trim()) {
        await tx.paciente.updateMany({ where: { cpf: input.cpf.trim(), hospitalId }, data: { status: 'Óbito' } });
      }
      return created;
    });

    return NextResponse.json(obito, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar óbito' }, { status: 500 });
  }
}
