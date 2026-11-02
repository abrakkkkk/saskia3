import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';
import { pode } from '@/lib/permissions';
import { isTerminal, STATUS_DESFECHO, transicaoValida, type StatusPaciente } from '@/lib/paciente-status';

// Óbito não entra aqui de propósito: é registrado em /api/obitos, que também libera o leito.
const DESTINOS: readonly StatusPaciente[] = ['Internado', 'Alta Médica', 'Transferido', 'Evasão'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('uti:gerir');
    if (negado) return negado;

    const { id } = await params;
    const input = await lerJson(request);
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const status = input.status;
    const permitidos = status === 'OCUPADO' ? ['status', 'pacienteId'] : ['status', 'destino'];
    if (Object.keys(input).some(chave => !permitidos.includes(chave))) {
      return NextResponse.json({ error: 'Campo não permitido' }, { status: 400 });
    }
    if (status !== 'LIVRE' && status !== 'OCUPADO') {
      return NextResponse.json({ error: 'Status do leito inválido' }, { status: 400 });
    }
    const pacienteId = typeof input.pacienteId === 'string' ? input.pacienteId.trim() : '';
    if (status === 'OCUPADO' && !pacienteId) {
      return NextResponse.json({ error: 'Selecione um paciente cadastrado no hospital' }, { status: 400 });
    }
    const destino = DESTINOS.find(d => d === input.destino);
    if (status === 'LIVRE' && !destino) {
      return NextResponse.json({ error: 'Informe o destino do paciente para liberar o leito' }, { status: 400 });
    }
    if (destino && STATUS_DESFECHO.includes(destino) && !pode(ator.cargo, 'prontuario:desfecho')) {
      return NextResponse.json({ error: 'Somente o médico registra alta ou transferência' }, { status: 403 });
    }

    const { hospitalId } = ator;
    const resultado = await prisma.$transaction(async (tx) => {
      const leito = await tx.utiLeito.findFirst({ where: { id, hospitalId }, select: { id: true, pacienteId: true, status: true } });
      if (!leito) return { erro: 'Leito não encontrado', codigo: 404 } as const;

      if (status === 'LIVRE') {
        if (leito.status !== 'OCUPADO' || !leito.pacienteId) return { erro: 'Este leito não está ocupado', codigo: 409 } as const;

        const alterado = await tx.utiLeito.updateMany({
          where: { id, hospitalId, status: 'OCUPADO', pacienteId: leito.pacienteId },
          data: { status: 'LIVRE', pacienteId: null, pacienteNome: null, pacienteCpf: null },
        });
        if (alterado.count === 0) return { erro: 'O leito foi alterado por outra pessoa. Atualize a tela.', codigo: 409 } as const;

        // Só move quem ainda consta na UTI; não reabre desfecho já registrado em outra tela.
        await tx.paciente.updateMany({
          where: { id: leito.pacienteId, hospitalId, status: 'Internado - UTI' },
          data: { status: destino as StatusPaciente },
        });
        return { leito: await tx.utiLeito.findFirst({ where: { id, hospitalId } }), pacienteId: leito.pacienteId };
      }

      if (leito.status !== 'LIVRE' || leito.pacienteId) return { erro: 'O leito precisa estar livre para a admissão', codigo: 409 } as const;

      const paciente = await tx.paciente.findFirst({
        where: { id: pacienteId, hospitalId, arquivadoEm: null },
        select: { id: true, nome: true, cpf: true, status: true },
      });
      if (!paciente) return { erro: 'Paciente não encontrado neste hospital', codigo: 404 } as const;
      if (isTerminal(paciente.status)) return { erro: 'Paciente com óbito registrado não pode ser admitido', codigo: 409 } as const;
      if (!transicaoValida(paciente.status, 'Internado - UTI')) {
        return { erro: `Paciente em "${paciente.status}" não pode ser admitido direto na UTI. Atualize a etapa do atendimento antes.`, codigo: 409 } as const;
      }

      const jaInternado = await tx.utiLeito.findFirst({
        where: { hospitalId, pacienteId: paciente.id, status: 'OCUPADO', id: { not: id } },
        select: { id: true },
      });
      if (jaInternado) return { erro: 'Paciente já está vinculado a outro leito ocupado', codigo: 409 } as const;

      const alterado = await tx.utiLeito.updateMany({
        where: { id, hospitalId, status: 'LIVRE', pacienteId: null },
        data: { status: 'OCUPADO', pacienteId: paciente.id, pacienteNome: paciente.nome, pacienteCpf: paciente.cpf },
      });
      if (alterado.count === 0) return { erro: 'O leito foi alterado por outra pessoa. Atualize a tela.', codigo: 409 } as const;

      await tx.paciente.updateMany({ where: { id: paciente.id, hospitalId }, data: { status: 'Internado - UTI' } });
      return { leito: await tx.utiLeito.findFirst({ where: { id, hospitalId } }), pacienteId: paciente.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.codigo });

    await auditar(ator, status === 'OCUPADO' ? 'uti.admitir' : 'uti.liberar', 'UtiLeito', id, {
      pacienteId: resultado.pacienteId,
      ...(destino ? { destino } : {}),
    });
    return NextResponse.json(resultado.leito);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'O leito ou paciente foi atualizado em paralelo. Atualize a tela e tente novamente.' }, { status: 409 });
    }
    console.error('Erro ao atualizar leito de UTI');
    return NextResponse.json({ error: 'Erro ao atualizar leito de UTI' }, { status: 500 });
  }
}
