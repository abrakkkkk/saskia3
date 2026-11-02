import type { Prisma } from '@prisma/client';
import { DURACAO_AGENDAMENTO_MS } from './regras';

/** Procura outro agendamento ativo do profissional ou da sala que se sobreponha ao horário. */
export async function mensagemDeConflito(
  tx: Prisma.TransactionClient,
  alvo: { hospitalId: string; dataHora: Date; profissional?: string | null; sala?: string | null; ignorarId?: string },
) {
  const { hospitalId, dataHora, profissional, sala, ignorarId } = alvo;
  const recursos: Prisma.AgendamentoWhereInput[] = [
    ...(profissional ? [{ profissional: { equals: profissional, mode: 'insensitive' as const } }] : []),
    ...(sala ? [{ sala: { equals: sala, mode: 'insensitive' as const } }] : []),
  ];
  if (recursos.length === 0) return null;

  // Duração fixa dos dois lados: há sobreposição quando os inícios distam menos de 30 min.
  const conflito = await tx.agendamento.findFirst({
    where: {
      hospitalId,
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
      status: { notIn: ['CONCLUIDO', 'CANCELADO', 'FALTOU'] },
      dataHora: {
        gt: new Date(dataHora.getTime() - DURACAO_AGENDAMENTO_MS),
        lt: new Date(dataHora.getTime() + DURACAO_AGENDAMENTO_MS),
      },
      OR: recursos,
    },
    select: { profissional: true, sala: true, dataHora: true },
  });
  if (!conflito) return null;

  const horario = conflito.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const mesmoProfissional = profissional && conflito.profissional?.toLowerCase() === profissional.toLowerCase();
  return mesmoProfissional
    ? `${profissional} já tem atendimento às ${horario}, dentro do intervalo de 30 minutos`
    : `A sala ${conflito.sala} já está reservada às ${horario}, dentro do intervalo de 30 minutos`;
}
