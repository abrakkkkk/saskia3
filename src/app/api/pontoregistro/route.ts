import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const body = await request.json();
    const { tipo, localizacao } = body;

    const tiposValidos = ['ENTRADA', 'SAÍDA', 'SAIDA', 'ALMOÇO - INÍCIO', 'ALMOCO - INICIO', 'ALMOÇO - RETORNO', 'ALMOCO - RETORNO', 'PAUSA - INÍCIO', 'PAUSA - RETORNO'];
    if (!tipo || !tiposValidos.includes(tipo.toUpperCase())) {
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
        localizacao: localizacao || null
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