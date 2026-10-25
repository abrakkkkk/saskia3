import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json([], { status: 401 });

    const hospitalId = session.user.hospitalId;
    
    const tickets = await prisma.ouvidoriaTicket.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tickets);
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

    // Gera um protocolo único e rastreável: OUV-AAAAMM-RANDOM-TIMESTAMP
    const anoMes = new Date().toISOString().slice(0, 7).replace('-', '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const protocoloId = `OUV-${anoMes}-${rand}-${Date.now().toString().slice(-4)}`;

    const ticket = await prisma.ouvidoriaTicket.create({
      data: {
        hospitalId,
        protocolo: protocoloId,
        tipo: body.tipo,
        setor: body.setor,
        paciente: body.paciente,
        mensagem: body.mensagem,
        status: 'ABERTO',
        prazo: body.tipo === 'Elogio' ? '-' : 'Vence em 48h'
      }
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
