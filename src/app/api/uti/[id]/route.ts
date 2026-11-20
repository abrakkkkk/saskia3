import { NextRequest, NextResponse } from 'next/server';
import type { TipoSaidaInternacao } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson } from '@/lib/api-guard';
import { pode } from '@/lib/permissions';
import { STATUS_DESFECHO, type StatusPaciente } from '@/lib/paciente-status';
import { buscarAberta, ehFalha, encerrar, falha, internar, SETOR_UTI, trocarLeito } from '@/lib/internacao';
import { respostaErro, SERIALIZAVEL } from '@/lib/internacao-api';

// Óbito não entra aqui de propósito: é registrado em /api/obitos, que também encerra a internação e libera o leito.
const DESTINOS: readonly StatusPaciente[] = ['Internado', 'Alta Médica', 'Transferido', 'Evasão'];
const SAIDA_DO_DESTINO: Partial<Record<StatusPaciente, TipoSaidaInternacao>> = {
  'Alta Médica': 'ALTA_MEDICA',
  'Transferido': 'TRANSFERENCIA',
  'Evasão': 'EVASAO',
};

const texto = (valor: unknown, limite: number) => (typeof valor === 'string' ? valor.trim().slice(0, limite) || null : null);

// Admissão (OCUPADO) e liberação (LIVRE) de leito de UTI. Ambas passam pela internação (item 9):
// admitir interna o paciente ou troca o leito de quem já está internado; liberar troca para a enfermaria ou encerra.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('uti:gerir');
    if (negado) return negado;

    const { id } = await params;
    const input = await lerJson(request);
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const status = input.status;
    const permitidos = status === 'OCUPADO'
      ? ['status', 'pacienteId', 'motivo', 'cid', 'medicoResponsavelId']
      : ['status', 'destino', 'destinoTransferencia', 'motivo', 'setor', 'leito'];
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
    const destinoTransferencia = texto(input.destinoTransferencia, 200);
    if (destino === 'Transferido' && !destinoTransferencia) {
      return NextResponse.json({ error: 'Informe o destino da transferência' }, { status: 400 });
    }
    const motivo = texto(input.motivo, 2000);

    const { hospitalId } = ator;
    const resultado = await prisma.$transaction(async (tx) => {
      const leito = await tx.utiLeito.findFirst({ where: { id, hospitalId }, select: { id: true, pacienteId: true, status: true } });
      if (!leito) return falha('Leito não encontrado', 404);

      if (status === 'LIVRE') {
        if (leito.status !== 'OCUPADO' || !leito.pacienteId) return falha('Este leito não está ocupado');
        const internacao = await tx.internacao.findFirst({ where: { hospitalId, utiLeitoId: id, saidaEm: null }, select: { id: true } });
        if (!internacao) return falha('Este leito não tem internação aberta. Atualize a tela.');
        const r = destino === 'Internado'
          ? await trocarLeito(tx, ator, internacao.id, { setor: texto(input.setor, 80) ?? 'Enfermaria', leito: texto(input.leito, 40), utiLeitoId: null }, motivo ?? 'Alta da UTI')
          : await encerrar(tx, ator, internacao.id, { tipoSaida: SAIDA_DO_DESTINO[destino!]!, destinoTransferencia: destino === 'Transferido' ? destinoTransferencia : null, motivoSaida: motivo });
        if (ehFalha(r)) return r;
        return { pacienteId: r.pacienteId, internacaoId: internacao.id };
      }

      if (leito.status !== 'LIVRE' || leito.pacienteId) return falha('O leito precisa estar livre para a admissão');
      const aberta = await buscarAberta(tx, hospitalId, pacienteId);
      const r = aberta
        ? await trocarLeito(tx, ator, aberta.id, { setor: SETOR_UTI, leito: null, utiLeitoId: id }, motivo ?? 'Admissão na UTI')
        : await internar(tx, ator, pacienteId, {
          setor: SETOR_UTI, leito: null, utiLeitoId: id, motivo: motivo ?? 'Admissão na UTI',
          cid: texto(input.cid, 12), medicoResponsavelId: texto(input.medicoResponsavelId, 64),
        });
      if (ehFalha(r)) return r;
      return { pacienteId: r.pacienteId, internacaoId: r.internacaoId };
    }, SERIALIZAVEL);

    if (ehFalha(resultado)) return NextResponse.json({ error: resultado.erro }, { status: resultado.codigo });

    await auditar(ator, status === 'OCUPADO' ? 'uti.admitir' : 'uti.liberar', 'UtiLeito', id, {
      pacienteId: resultado.pacienteId,
      internacaoId: resultado.internacaoId,
      ...(destino ? { destino } : {}),
    });
    return NextResponse.json(await prisma.utiLeito.findFirst({ where: { id, hospitalId } }));
  } catch (error: unknown) {
    return respostaErro(error, 'atualizar leito de UTI');
  }
}
