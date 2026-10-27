import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const allowedKeys = input.status === 'OCUPADO' ? ['status', 'pacienteId'] : ['status'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
      return NextResponse.json({ error: 'Campo não permitido' }, { status: 400 });
    }
    if (input.status !== 'LIVRE' && input.status !== 'OCUPADO') {
      return NextResponse.json({ error: 'Status do leito inválido' }, { status: 400 });
    }
    const status: 'LIVRE' | 'OCUPADO' = input.status;
    if (status === 'OCUPADO' && (typeof input.pacienteId !== 'string' || !input.pacienteId.trim())) {
      return NextResponse.json({ error: 'Selecione um paciente cadastrado no hospital' }, { status: 400 });
    }

    const atualizado = await prisma.$transaction(async (tx) => {
       const leito = await tx.utiLeito.findFirst({ where: { id, hospitalId }, select: { id: true, pacienteId: true, status: true } });
       if (!leito) return { error: 'leito' as const };
       if (status === 'OCUPADO' && (leito.status !== 'LIVRE' || leito.pacienteId)) return { error: 'ocupado' as const };
       if (status === 'LIVRE' && (leito.status !== 'OCUPADO' || !leito.pacienteId)) return { error: 'ocupado' as const };

       let paciente: { id: string; nome: string; cpf: string | null } | null = null;
       if (status === 'OCUPADO') {
          paciente = await tx.paciente.findFirst({
            where: { id: input.pacienteId as string, hospitalId, arquivadoEm: null },
            select: { id: true, nome: true, cpf: true },
          });
          if (!paciente) return { error: 'paciente' as const };
          const jaInternado = await tx.utiLeito.findFirst({
            where: { hospitalId, pacienteId: paciente.id, status: 'OCUPADO', id: { not: id } },
            select: { id: true },
          });
          if (jaInternado) return { error: 'duplicado' as const };
       }

       const data: Prisma.UtiLeitoUncheckedUpdateManyInput = { status };
       if (status === 'OCUPADO' && paciente) {
         data.pacienteId = paciente.id;
         data.pacienteNome = paciente.nome;
         data.pacienteCpf = paciente.cpf;
       } else if (status === 'LIVRE') {
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
       
       if (paciente && status === 'OCUPADO') {
          await tx.paciente.updateMany({
            where: { id: paciente.id, hospitalId },
            data: { status: 'Internado - UTI' }
          });
       }

       if (status === 'LIVRE' && leito.pacienteId) {
         await tx.paciente.updateMany({
           where: { id: leito.pacienteId, hospitalId, status: 'Internado - UTI' },
           data: { status: 'Internado' },
         });
       }
       
       return { leito: updatedLeito };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in atualizado) {
      const statusCode = atualizado.error === 'duplicado' || atualizado.error === 'ocupado' ? 409 : 404;
      const message = atualizado.error === 'duplicado'
        ? 'Paciente já está vinculado a outro leito ocupado'
        : atualizado.error === 'ocupado'
          ? 'O leito precisa estar livre para esta alteração'
          : atualizado.error === 'paciente'
            ? 'Paciente não encontrado neste hospital'
            : 'Leito não encontrado';
      return NextResponse.json({ error: message }, { status: statusCode });
    }

    return NextResponse.json(atualizado.leito);
  } catch (error: unknown) {
    console.error("Erro ao atualizar leito de UTI:", error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'O leito ou paciente foi atualizado em paralelo. Atualize a tela e tente novamente.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar leito de UTI' }, { status: 500 });
  }
}
