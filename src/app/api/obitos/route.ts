import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const obitos = await prisma.obito.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(obitos);
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

    const obito = await prisma.obito.create({
      data: {
        hospitalId,
        nome: body.nome,
        nascimento: body.nascimento,
        cpf: body.cpf,
        sexo: body.sexo,
        data: body.data,
        hora: body.hora,
        local: body.local,
        causa: body.causa,
        causaSec: body.causaSec,
        medico: body.medico,
        prontuario: body.prontuario,
        responsavel: body.responsavel,
        telefone: body.telefone,
        observacoes: body.observacoes,
        registradoPor: body.registradoPor,
        dataRegistro: body.dataRegistro,
        certidaoEmitida: body.certidaoEmitida || false
      }
    });

    // Opcional: Atualizar o paciente para status "Óbito" se o CPF bater
    if (body.cpf) {
      const paciente = await prisma.paciente.findFirst({
        where: { cpf: body.cpf, hospitalId }
      });
      if (paciente) {
        await prisma.paciente.update({
          where: { id: paciente.id },
          data: { status: 'Óbito' }
        });
      }
    }

    return NextResponse.json(obito, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
