import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exigir, lerJson } from '@/lib/api-guard';

// Emite a ficha interna: o booleano legado continua no modelo, e a data real de emissão
// fica na auditoria, na mesma transação, sem exigir migração.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('obito:registrar');
    if (negado) return negado;

    const { id } = await params;
    const body = await lerJson(request);
    if (!body || Object.keys(body).length !== 1 || body.certidaoEmitida !== true) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const obito = await tx.obito.findFirst({ where: { id, hospitalId: ator.hospitalId }, select: { id: true } });
      if (!obito) return { erro: 'Registro de óbito não encontrado', status: 404 } as const;

      const atualizado = await tx.obito.updateMany({
        where: { id, hospitalId: ator.hospitalId, certidaoEmitida: false },
        data: { certidaoEmitida: true },
      });
      if (atualizado.count === 0) return { erro: 'A ficha interna já foi emitida', status: 409 } as const;

      const emissao = await tx.auditoria.create({
        data: {
          hospitalId: ator.hospitalId,
          usuarioId: ator.id,
          usuarioNome: ator.nome,
          cargo: ator.cargo,
          acao: 'obito.ficha_emitida',
          entidade: 'Obito',
          entidadeId: id,
        },
        select: { createdAt: true },
      });
      const registro = await tx.obito.findFirst({ where: { id, hospitalId: ator.hospitalId } });
      return { registro, fichaEmitidaEm: emissao.createdAt };
    });

    if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status });
    return NextResponse.json({ ...resultado.registro, fichaEmitidaEm: resultado.fichaEmitidaEm });
  } catch {
    return NextResponse.json({ error: 'Erro ao emitir a ficha interna de óbito' }, { status: 500 });
  }
}
