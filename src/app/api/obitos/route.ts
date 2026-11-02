import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard';
import { isTerminal } from '@/lib/paciente-status';

const ACAO_FICHA = 'obito.ficha_emitida';

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours < 24 && minutes < 60;
}

// Usa o fuso mais a oeste do Brasil: só recusa o que é futuro em qualquer fuso do país.
function dataFutura(data: string, hora: string) {
  return new Date(`${data}T${hora}:00-05:00`).getTime() > Date.now();
}

export async function GET() {
  try {
    const { ator, negado } = await exigir('obito:ler');
    if (negado) return negado;

    const obitos = await prisma.obito.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    });

    // A data de emissão fica na trilha de auditoria, gravada junto com o booleano.
    const emissoes = await prisma.auditoria.findMany({
      where: { hospitalId: ator.hospitalId, entidade: 'Obito', acao: ACAO_FICHA, entidadeId: { in: obitos.map(o => o.id) } },
      select: { entidadeId: true, createdAt: true },
    });
    const emissaoPorObito = new Map(emissoes.map(e => [e.entidadeId, e.createdAt]));

    return NextResponse.json(obitos.map(o => ({ ...o, fichaEmitidaEm: emissaoPorObito.get(o.id) ?? null })));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar registros de óbito' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('obito:registrar');
    if (negado) return negado;

    const input = await lerJson(request);
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const limites = { nome: 160, nascimento: 40, cpf: 20, sexo: 40, local: 160, causa: 1000, causaSec: 1000, medico: 160, prontuario: 100, responsavel: 160, telefone: 40, observacoes: 4000 };
    const textosInvalidos = Object.entries(limites).some(([campo, max]) => {
      const valor = input[campo];
      return valor !== undefined && valor !== null && (typeof valor !== 'string' || valor.length > max);
    });
    const { data, hora, causa } = input;
    const pacienteId = typeof input.pacienteId === 'string' ? input.pacienteId.trim() : '';
    const semCadastro = input.semCadastro === true;

    if (textosInvalidos
      || typeof data !== 'string' || !isValidDate(data)
      || typeof hora !== 'string' || !isValidTime(hora)
      || typeof causa !== 'string' || !causa.trim()
      || (typeof input.nascimento === 'string' && input.nascimento !== '' && !isValidDate(input.nascimento))) {
      return NextResponse.json({ error: 'Dados do óbito inválidos' }, { status: 400 });
    }
    if (dataFutura(data, hora)) {
      return NextResponse.json({ error: 'A data e a hora do óbito não podem estar no futuro' }, { status: 400 });
    }
    if (pacienteId ? semCadastro : !semCadastro) {
      return NextResponse.json({ error: 'Selecione o paciente ou marque o registro como exceção sem cadastro' }, { status: 400 });
    }
    if (semCadastro && (typeof input.nome !== 'string' || !input.nome.trim())) {
      return NextResponse.json({ error: 'Informe o nome para o registro sem cadastro' }, { status: 400 });
    }

    const opcional = (campo: string) => typeof input[campo] === 'string' ? (input[campo] as string).trim() || null : null;
    const medico = opcional('medico') ?? ator.nome;
    const agora = new Date();

    const resultado = await prisma.$transaction(async (tx) => {
      let paciente: { id: string; nome: string; cpf: string | null; nascimento: Date | null; sexo: string | null } | null = null;

      if (pacienteId) {
        const encontrado = await tx.paciente.findFirst({
          where: { id: pacienteId, hospitalId: ator.hospitalId, arquivadoEm: null },
          select: { id: true, nome: true, cpf: true, nascimento: true, sexo: true, status: true },
        });
        if (!encontrado) return { erro: 'Paciente não encontrado neste hospital', status: 404 } as const;
        const jaRegistrado = await tx.obito.findFirst({ where: { hospitalId: ator.hospitalId, pacienteId }, select: { id: true } });
        if (isTerminal(encontrado.status) || jaRegistrado) return { erro: 'Este paciente já tem óbito registrado', status: 409 } as const;
        paciente = encontrado;
      } else {
        // Exceção sem cadastro não pode encobrir um paciente que existe no hospital.
        const cpf = opcional('cpf');
        if (cpf) {
          const digitos = cpf.replace(/\D/g, '');
          const formatado = digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
          const existente = await tx.paciente.findFirst({
            where: { hospitalId: ator.hospitalId, arquivadoEm: null, cpf: { in: [cpf, digitos, formatado] } },
            select: { id: true },
          });
          if (existente) return { erro: 'Este CPF pertence a um paciente cadastrado. Selecione o paciente na lista.', status: 409 } as const;
        }
      }

      const obito = await tx.obito.create({
        data: {
          hospitalId: ator.hospitalId,
          pacienteId: paciente?.id ?? null,
          usuarioId: ator.id,
          nome: paciente?.nome ?? (input.nome as string).trim(),
          nascimento: paciente ? paciente.nascimento?.toISOString().slice(0, 10) ?? null : opcional('nascimento'),
          cpf: paciente ? paciente.cpf : opcional('cpf'),
          sexo: paciente?.sexo ?? opcional('sexo'),
          data,
          hora,
          local: opcional('local'),
          causa: causa.trim(),
          causaSec: opcional('causaSec'),
          medico,
          prontuario: opcional('prontuario'),
          responsavel: opcional('responsavel'),
          telefone: opcional('telefone'),
          observacoes: opcional('observacoes'),
          registradoPor: ator.nome,
          dataRegistro: agora.toISOString(),
          certidaoEmitida: false,
        },
      });

      if (!paciente) return { obito, efeitos: null };

      const onde = { hospitalId: ator.hospitalId, pacienteId: paciente.id };
      await tx.paciente.updateMany({ where: { id: paciente.id, hospitalId: ator.hospitalId }, data: { status: 'Óbito' } });
      const leitos = await tx.utiLeito.updateMany({
        where: { ...onde, status: 'OCUPADO' },
        data: { status: 'LIVRE', pacienteId: null, pacienteNome: null, pacienteCpf: null },
      });
      const chamadas = await tx.chamada.updateMany({ where: { ...onde, status: 'ATIVA' }, data: { status: 'FINALIZADA' } });
      const agendamentos = await tx.agendamento.updateMany({
        where: { ...onde, dataHora: { gte: agora }, status: { in: ['AGENDADO', 'CONFIRMADO', 'EM_ESPERA'] } },
        data: { status: 'CANCELADO' },
      });
      const cirurgias = await tx.cirurgia.updateMany({
        where: { ...onde, dataHora: { gte: agora }, status: { in: ['AGENDADA', 'EM_PREPARO'] } },
        data: { status: 'CANCELADA' },
      });

      return { obito, efeitos: { leitos: leitos.count, chamadas: chamadas.count, agendamentos: agendamentos.count, cirurgias: cirurgias.count } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status });

    await auditar(ator, 'obito.registrar', 'Obito', resultado.obito.id, {
      semCadastro,
      ...(resultado.efeitos ?? {}),
    });
    return NextResponse.json({ ...resultado.obito, fichaEmitidaEm: null, efeitos: resultado.efeitos }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'O paciente foi atualizado em paralelo. Atualize a tela e tente novamente.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao registrar óbito' }, { status: 500 });
  }
}
