import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const body = await request.json();

    const leito = await prisma.utiLeito.findFirst({
      where: { id: id, hospitalId }
    });

    if (!leito) {
      return NextResponse.json({ error: 'Leito não encontrado' }, { status: 404 });
    }

    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.pacienteNome !== undefined) data.pacienteNome = body.pacienteNome;
    if (body.pacienteCpf !== undefined) data.pacienteCpf = body.pacienteCpf;
    if (body.pacienteId !== undefined) data.pacienteId = body.pacienteId;
    
    // Se o leito estiver sendo liberado, remove os vínculos
    if (body.status === 'LIVRE') {
       data.pacienteId = null;
       data.pacienteNome = null;
       data.pacienteCpf = null;
    }

    const atualizado = await prisma.$transaction(async (tx) => {
       const updatedLeito = await tx.utiLeito.update({
         where: { id: id },
         data
       });
       
       // Se vinculou a um paciente, atualiza o status do paciente para Internado - UTI
       if (data.pacienteId && data.status === 'OCUPADO') {
          await tx.paciente.update({
            where: { id: data.pacienteId },
            data: { status: 'Internado - UTI' }
          });
       }
       
       return updatedLeito;
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error("Erro ao atualizar leito de UTI:", error);
    return NextResponse.json({ error: 'Erro ao atualizar leito de UTI' }, { status: 500 });
  }
}
