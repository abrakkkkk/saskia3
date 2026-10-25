import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    }

    // Se for admin, pode ver de todos do hospital; caso contrário, vê os próprios registros
    const isGestor = session.user.cargo === 'ADMIN';

    const data = await prisma.pontoRegistro.findMany({
      where: {
        hospitalId,
        ...(isGestor ? {} : { usuarioId: session.user.id })
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true
          }
        }
      },
      orderBy: { dataHora: 'desc' },
      take: 100
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar registros de ponto:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hospitalId = session.user.hospitalId;
    const usuarioId = session.user.id;
    if (!hospitalId || !usuarioId) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 403 });
    }

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const tipo = body.tipo;
    const localizacao = body.localizacao;

    const tiposValidos = ['ENTRADA', 'SAÍDA', 'SAIDA', 'ALMOÇO - INÍCIO', 'ALMOCO - INICIO', 'ALMOÇO - RETORNO', 'ALMOCO - RETORNO', 'PAUSA - INÍCIO', 'PAUSA - RETORNO'];
    if (typeof tipo !== 'string' || !tiposValidos.includes(tipo.toUpperCase()) || (localizacao !== undefined && localizacao !== null && (typeof localizacao !== 'string' || localizacao.length > 200))) {
      return NextResponse.json({ error: 'Tipo de ponto inválido' }, { status: 400 });
    }

    // Horário oficial do servidor (previne adulteração do relógio do cliente)
    const agora = new Date();

    const data = await prisma.pontoRegistro.create({
      data: {
        hospitalId,
        usuarioId,
        tipo: tipo.toUpperCase(),
        dataHora: agora,
        localizacao: typeof localizacao === 'string' && localizacao.trim() ? localizacao.trim() : null
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true
          }
        }
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar ponto:', error);
    return NextResponse.json({ error: 'Erro ao registrar ponto' }, { status: 500 });
  }
}
