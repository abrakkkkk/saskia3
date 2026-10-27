import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRecord } from '@/lib/request-validation';

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    
    const ordens = await prisma.manutencaoOS.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(ordens);
  } catch (error) {
    console.error('Erro ao buscar ordens de manutenção:', error)
    return NextResponse.json({ error: 'Erro ao buscar ordens de manutenção' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    if (
      !isRecord(body) ||
      typeof body.equipamento !== 'string' || !body.equipamento.trim() || body.equipamento.length > 200 ||
      typeof body.setor !== 'string' || !body.setor.trim() || body.setor.length > 100 ||
      typeof body.tipo !== 'string' || !['Preventiva', 'Corretiva', 'Preditiva', 'Calibração', 'Emergencial'].includes(body.tipo) ||
      typeof body.prioridade !== 'string' || !['Normal', 'Urgente', 'Emergência'].includes(body.prioridade) ||
      (body.data !== undefined && (typeof body.data !== 'string' || !isValidDate(body.data))) ||
      (body.descricao !== undefined && body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 2000))
    ) return NextResponse.json({ error: 'Dados da ordem de manutenção inválidos' }, { status: 400 });

    const ordem = await prisma.manutencaoOS.create({
      data: {
        hospitalId,
        equipamento: body.equipamento.trim(),
        setor: body.setor.trim(),
        tipo: body.tipo,
        prioridade: body.prioridade,
        solicitante: session.user.name || session.user.email || 'Profissional autenticado',
        data: body.data || new Date().toISOString().slice(0, 10),
        descricao: typeof body.descricao === 'string' ? body.descricao.trim() : '',
        status: 'Aberta'
      }
    });

    return NextResponse.json(ordem, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar OS de manutenção:', error)
    return NextResponse.json({ error: 'Erro ao criar ordem de manutenção' }, { status: 500 });
  }
}
