import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const MAX_PROCEDIMENTO = 200;
const MAX_SALA = 100;
const MAX_EQUIPE = 500;
const MAX_OBSERVACOES = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, maxLength: number, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`${field} inválido`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${field} excede o limite permitido`);
  return normalized || null;
}

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 40) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });

    const cirurgias = await prisma.cirurgia.findMany({
      where: { hospitalId },
      include: { paciente: { select: { nome: true } } },
      orderBy: { dataHora: 'asc' },
    });
    return NextResponse.json(cirurgias);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar cirurgias' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!['ADMIN', 'MEDICO'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Apenas ADMIN ou MEDICO pode agendar cirurgias' }, { status: 403 });
    }
    const hospitalId = session.user.hospitalId;
    const usuarioId = session.user.id;
    if (!hospitalId || !usuarioId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const procedimento = typeof body.procedimento === 'string' ? body.procedimento.trim() : '';
    const dataHora = parseDateTime(body.dataHora);
    if (!pacienteId || pacienteId.length > 64 || !procedimento || procedimento.length > MAX_PROCEDIMENTO || !dataHora) {
      return NextResponse.json({ error: 'Paciente, procedimento e data/hora válidos são obrigatórios' }, { status: 400 });
    }

    let sala: string | null | undefined;
    let equipe: string | null | undefined;
    let anestesia: string | null | undefined;
    let observacoes: string | null | undefined;
    try {
      sala = optionalText(body.sala, MAX_SALA, 'Sala');
      equipe = optionalText(body.equipe, MAX_EQUIPE, 'Equipe');
      anestesia = optionalText(body.anestesia, 100, 'Anestesia');
      observacoes = optionalText(body.observacoes, MAX_OBSERVACOES, 'Observações');
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Dados inválidos' }, { status: 400 });
    }

    const cirurgia = await prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.findFirst({
        where: { id: pacienteId, hospitalId, arquivadoEm: null },
        select: { id: true },
      });
      if (!paciente) return { error: 'Paciente não encontrado' as const };

      // Bloqueia conflitos no mesmo instante também no servidor. A duração ainda não
      // é um campo persistido no modelo, portanto a validação de intervalos requer
      // modelagem própria antes de ser tratada como garantia.
      const conflito = await tx.cirurgia.findFirst({
        where: {
          hospitalId,
          dataHora,
          status: { notIn: ['CONCLUIDA', 'CANCELADA'] },
          OR: [
            { pacienteId },
            ...(sala ? [{ sala }] : []),
          ],
        },
        select: { id: true },
      });
      if (conflito) return { error: 'Já existe cirurgia ativa para este paciente ou sala nesse horário' as const };

      return tx.cirurgia.create({
        data: {
          hospitalId,
          pacienteId,
          usuarioId,
          procedimento,
          sala: sala ?? null,
          dataHora,
          equipe: equipe ?? null,
          anestesia: anestesia ?? null,
          observacoes: observacoes ?? null,
        },
        include: { paciente: { select: { nome: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in cirurgia) {
      const status = cirurgia.error === 'Paciente não encontrado' ? 404 : 409;
      return NextResponse.json({ error: cirurgia.error }, { status });
    }
    return NextResponse.json(cirurgia, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Conflito de agendamento. Atualize a lista e tente novamente.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar cirurgia' }, { status: 500 });
  }
}
