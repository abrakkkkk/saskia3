import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const body = await request.json();
    const validStatuses = ['LIVRE', 'OCUPADO', 'RESERVADO', 'MANUTENCAO', 'LIMPEZA']
    if (!validStatuses.includes(body.status)) return NextResponse.json({ error: 'Status do leito inválido' }, { status: 400 });
    if (body.status === 'OCUPADO' && typeof body.pacienteId !== 'string') {
      return NextResponse.json({ error: 'Selecione um paciente cadastrado no hospital' }, { status: 400 });
    }

    const atualizado = await prisma.$transaction(async (tx) => {
       const leito = await tx.utiLeito.findFirst({ where: { id, hospitalId }, select: { id: true, pacienteId: true, status: true } });
       if (!leito) return { error: 'leito' as const };
       if (body.status === 'OCUPADO' && (leito.status !== 'LIVRE' || leito.pacienteId)) return { error: 'ocupado' as const };
       if (body.status !== 'OCUPADO' && body.status !== 'LIVRE' && leito.pacienteId) return { error: 'ocupado' as const };

       let paciente: { id: string; nome: string; cpf: string | null } | null = null;
       if (body.status === 'OCUPADO') {
          paciente = await tx.paciente.findFirst({
            where: { id: body.pacienteId, hospitalId },
            select: { id: true, nome: true, cpf: true },
          });
          if (!paciente) return { error: 'paciente' as const };
          const jaInternado = await tx.utiLeito.findFirst({
            where: { hospitalId, pacienteId: paciente.id, status: 'OCUPADO', id: { not: id } },
            select: { id: true },
          });
          if (jaInternado) return { error: 'duplicado' as const };
       }

       const data: Prisma.UtiLeitoUncheckedUpdateManyInput = { status: body.status };
       if (body.status === 'OCUPADO' && paciente) {
         data.pacienteId = paciente.id;
         data.pacienteNome = paciente.nome;
         data.pacienteCpf = paciente.cpf;
       } else if (body.status === 'LIVRE') {
         data.pacienteId = null;
         data.pacienteNome = null;
         data.pacienteCpf = null;
       }

       const changed = await tx.utiLeito.updateMany({
         where: { id, hospitalId, status: leito.status, pacienteId: leito.pacienteId },
         data,
       });
       if (changed.count === 0) return { error: 'leito' as const };
       const updatedLeito = await tx.utiLeito.findFirst({ where: { id, hospitalId } });
       
       if (paciente && body.status === 'OCUPADO') {
          await tx.paciente.updateMany({
            where: { id: paciente.id, hospitalId },
            data: { status: 'Internado - UTI' }
          });
       }

       if (body.status === 'LIVRE' && leito.pacienteId) {
         await tx.paciente.updateMany({
           where: { id: leito.pacienteId, hospitalId, status: 'Internado - UTI' },
           data: { status: 'Internado' },
         });
       }
       
       return { leito: updatedLeito };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in atualizado) {
      const status = atualizado.error === 'duplicado' || atualizado.error === 'ocupado' ? 409 : 404;
      const message = atualizado.error === 'duplicado'
        ? 'Paciente já está vinculado a outro leito ocupado'
        : atualizado.error === 'ocupado'
          ? 'O leito precisa estar livre para esta alteração'
          : atualizado.error === 'paciente'
            ? 'Paciente não encontrado neste hospital'
            : 'Leito não encontrado';
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(atualizado.leito);
  } catch (error: any) {
    console.error("Erro ao atualizar leito de UTI:", error);
    return NextResponse.json({ error: 'Erro ao atualizar leito de UTI' }, { status: 500 });
  }
}
