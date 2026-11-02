import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard';
import { isTerminal } from '@/lib/paciente-status';
import { DURACAO_MAXIMA_HORAS, duracaoEmHoras, textoDuracao } from './regras';

const MAX_PROCEDIMENTO = 200;
const MAX_SALA = 100;
const MAX_EQUIPE = 500;
const MAX_OBSERVACOES = 2000;
const HORA_MS = 3_600_000;

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
    const { ator, negado } = await exigir('cirurgia:ler');
    if (negado) return negado;

    const cirurgias = await prisma.cirurgia.findMany({
      where: { hospitalId: ator.hospitalId },
      include: { paciente: { select: { nome: true } } },
      orderBy: { dataHora: 'desc' },
      take: LIMITE_LISTA,
    });
    return NextResponse.json(cirurgias);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar cirurgias' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('cirurgia:gerir');
    if (negado) return negado;
    const { hospitalId } = ator;

    const body = await lerJson(request);
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const procedimento = typeof body.procedimento === 'string' ? body.procedimento.trim() : '';
    const dataHora = parseDateTime(body.dataHora);
    if (!pacienteId || pacienteId.length > 64 || !procedimento || procedimento.length > MAX_PROCEDIMENTO || !dataHora) {
      return NextResponse.json({ error: 'Paciente, procedimento e data/hora válidos são obrigatórios' }, { status: 400 });
    }
    const duracaoHoras = Number(body.duracaoHoras);
    if (!Number.isFinite(duracaoHoras) || duracaoHoras <= 0 || duracaoHoras > DURACAO_MAXIMA_HORAS) {
      return NextResponse.json({ error: `Informe a duração prevista, até ${DURACAO_MAXIMA_HORAS} horas` }, { status: 400 });
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

    const inicio = dataHora.getTime();
    const fim = inicio + duracaoHoras * HORA_MS;

    const cirurgia = await prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.findFirst({
        where: { id: pacienteId, hospitalId, arquivadoEm: null },
        select: { id: true, status: true },
      });
      if (!paciente) return { erro: 'Paciente não encontrado', status: 404 } as const;
      if (isTerminal(paciente.status)) return { erro: 'Paciente com óbito registrado não pode ter cirurgia agendada', status: 409 } as const;

      // Candidatas: qualquer ativa que possa alcançar o intervalo, mesmo com a duração máxima.
      const candidatas = await tx.cirurgia.findMany({
        where: {
          hospitalId,
          status: { notIn: ['CONCLUIDA', 'CANCELADA'] },
          dataHora: { gt: new Date(inicio - DURACAO_MAXIMA_HORAS * HORA_MS), lt: new Date(fim) },
          OR: [{ pacienteId }, ...(sala ? [{ sala }] : [])],
        },
        select: { pacienteId: true, sala: true, dataHora: true, observacoes: true },
      });
      const conflito = candidatas.find((c) => {
        if (!c.dataHora) return false;
        const inicioOutra = c.dataHora.getTime();
        return inicioOutra < fim && inicioOutra + duracaoEmHoras(c.observacoes) * HORA_MS > inicio;
      });
      if (conflito) {
        const horario = conflito.dataHora!.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        const motivo = conflito.pacienteId === pacienteId
          ? `Este paciente já tem cirurgia ativa nesse intervalo (início às ${horario})`
          : `A sala ${conflito.sala} já está ocupada nesse intervalo (cirurgia às ${horario})`;
        return { erro: motivo, status: 409 } as const;
      }

      return tx.cirurgia.create({
        data: {
          hospitalId,
          pacienteId,
          usuarioId: ator.id,
          procedimento,
          sala: sala ?? null,
          dataHora,
          equipe: equipe ?? null,
          anestesia: anestesia ?? null,
          observacoes: [textoDuracao(duracaoHoras), observacoes].filter(Boolean).join(' '),
        },
        include: { paciente: { select: { nome: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('erro' in cirurgia) return NextResponse.json({ error: cirurgia.erro }, { status: cirurgia.status });

    await auditar(ator, 'cirurgia.agendar', 'Cirurgia', cirurgia.id, { pacienteId, sala: sala ?? null, duracaoHoras });
    return NextResponse.json(cirurgia, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Conflito de agendamento. Atualize a lista e tente novamente.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar cirurgia' }, { status: 500 });
  }
}
