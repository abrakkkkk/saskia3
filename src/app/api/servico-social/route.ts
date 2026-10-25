import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const casos = await prisma.casoSocial.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(casos);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    if (!body.pacienteNome || !body.situacao) {
      return NextResponse.json({ error: 'Paciente e situação são obrigatórios' }, { status: 400 });
    }

    const caso = await prisma.casoSocial.create({
      data: {
        hospitalId,
        pacienteNome: body.pacienteNome,
        situacao: body.situacao,
        detalhe: body.detalhe || null,
        status: body.status || 'EM ACOMPANHAMENTO'
      }
    });

    return NextResponse.json(caso, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();
    const { id, status, detalhe } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do caso é obrigatório' }, { status: 400 });
    }

    // Verify tenancy
    const casoExistente = await prisma.casoSocial.findUnique({ where: { id } });
    if (!casoExistente || casoExistente.hospitalId !== hospitalId) {
      return NextResponse.json({ error: 'Caso não encontrado ou não autorizado' }, { status: 404 });
    }

    const atualizado = await prisma.casoSocial.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(detalhe !== undefined ? { detalhe } : {})
      }
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
