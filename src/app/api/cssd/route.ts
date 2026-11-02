import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard';

const TENTATIVAS_NUMERO = 5;

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET() {
  try {
    const { ator, negado } = await exigir('cssd:ler');
    if (negado) return negado;

    const lotes = await prisma.cssdLote.findMany({
      where: { hospitalId: ator.hospitalId },
      select: {
        id: true,
        numero: true,
        setor: true,
        operador: true,
        status: true,
        equipamento: true,
        ciclo: true,
        data: true,
        indicadorQuimico: true,
        indicadorBiologico: true,
        bowieDick: true,
        itens: { select: { id: true, integridade: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    });

    return NextResponse.json(lotes, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    console.error('Erro ao buscar lotes CSSD:', error instanceof Error ? error.name : 'erro');
    return NextResponse.json({ error: 'Erro ao buscar lotes de esterilização' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('cssd:gerir');
    if (negado) return negado;

    const body = await lerJson(request);
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const required = ['setor', 'data', 'equipamento', 'ciclo'];
    if (required.some((key) => typeof body[key] !== 'string' || !(body[key] as string).trim() || (body[key] as string).length > 200)
      || !isValidDateKey(body.data as string)
      || (body.obs !== undefined && body.obs !== null && (typeof body.obs !== 'string' || body.obs.length > 2000))) {
      return NextResponse.json({ error: 'Preencha corretamente os campos obrigatórios do lote' }, { status: 400 });
    }

    const prefixo = `CSSD-${new Date().getFullYear()}-`;

    // Sequência por hospital no ano. Criação concorrente aborta uma das transações serializáveis, que tenta de novo.
    for (let tentativa = 1; ; tentativa++) {
      try {
        const lote = await prisma.$transaction(async tx => {
          const existentes = await tx.cssdLote.findMany({
            where: { hospitalId: ator.hospitalId, numero: { startsWith: prefixo } },
            select: { numero: true },
          });
          const ultimo = existentes.reduce((maior, { numero }) => {
            const sequencia = Number(numero.slice(prefixo.length));
            return Number.isInteger(sequencia) && sequencia > maior ? sequencia : maior;
          }, 0);

          return tx.cssdLote.create({
            data: {
              hospitalId: ator.hospitalId,
              numero: `${prefixo}${String(ultimo + 1).padStart(3, '0')}`,
              setor: (body.setor as string).trim(),
              operador: ator.nome,
              data: (body.data as string).trim(),
              equipamento: (body.equipamento as string).trim(),
              ciclo: (body.ciclo as string).trim(),
              // Os indicadores só existem depois do ciclo: ver PUT /api/cssd/[id].
              indicadorQuimico: '',
              indicadorBiologico: '',
              bowieDick: '',
              obs: typeof body.obs === 'string' && body.obs.trim() ? body.obs.trim() : null,
              status: 'Recepção',
            },
            include: { itens: true },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        await auditar(ator, 'CSSD_LOTE_CRIADO', 'CssdLote', lote.id, { numero: lote.numero, setor: lote.setor });
        return NextResponse.json(lote, { status: 201 });
      } catch (error) {
        const conflito = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002');
        if (!conflito || tentativa >= TENTATIVAS_NUMERO) throw error;
      }
    }
  } catch (error) {
    console.error('Erro ao registrar lote CSSD:', error instanceof Error ? error.name : 'erro');
    return NextResponse.json({ error: 'Erro ao registrar lote de esterilização' }, { status: 500 });
  }
}
