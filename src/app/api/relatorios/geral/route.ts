import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const inicioStr = searchParams.get('inicio');
    const fimStr = searchParams.get('fim');

    const validDate = (value: string | null) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!validDate(inicioStr) || !validDate(fimStr)) return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    const startDate = inicioStr ? new Date(`${inicioStr}T00:00:00Z`) : new Date(0);
    const endDate = fimStr ? new Date(`${fimStr}T23:59:59Z`) : new Date();
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    }

    // Consultas paralelas para os relatórios
    const [
      pacientesPorStatus,
      utiLeitos,
      movimentacoes,
      almoxItens,
      cirurgias,
      exames,
      obitos,
      iras,
      cssd,
      ouvidoria
    ] = await Promise.all([
      prisma.paciente.groupBy({ where: { hospitalId }, by: ['status'], _count: { _all: true } }),
      prisma.utiLeito.findMany({ where: { hospitalId }, select: { status: true } }),
      prisma.movimentacaoEstoque.count({
        where: { hospitalId, tipo: 'SAIDA', createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.estoqueItem.count({ where: { hospitalId, categoria: 'ALMOXARIFADO' } }),
      prisma.cirurgia.count({ where: { hospitalId, dataHora: { gte: startDate, lte: endDate } } }),
      prisma.exame.count({ where: { hospitalId, createdAt: { gte: startDate, lte: endDate } } }),
      prisma.obito.count({ where: { hospitalId } }),
      prisma.ccihRegistro.count({ where: { hospitalId, tipo: 'INFECCAO', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.cssdLote.count({ where: { hospitalId, createdAt: { gte: startDate, lte: endDate } } }),
      prisma.ouvidoriaTicket.count({ where: { hospitalId, createdAt: { gte: startDate, lte: endDate } } })
    ]);

    const utiOcupados = utiLeitos.filter(l => l.status === "OCUPADO").length;

    // Aggregations that require JS array filtering due to string dates or status logic
    const totalPacientes = pacientesPorStatus.reduce((total, item) => total + item._count._all, 0);
    const contarStatus = (...statuses: string[]) => pacientesPorStatus
      .filter(item => item.status !== null && statuses.includes(item.status))
      .reduce((total, item) => total + item._count._all, 0);
    const atendimentos = contarStatus('Finalizado', 'Alta Médica', 'Alta');
    const internacoes = contarStatus('Internado');
    const altas = contarStatus('Alta', 'Alta Médica');

    const relatorioData = {
      totalPacientes,
      atendimentos,
      internacoes,
      altas,
      obitos: obitos,
      taxaUTI: utiLeitos.length > 0 ? Math.round((utiOcupados / utiLeitos.length) * 100) + "%" : "0%",
      dispensacoes: movimentacoes,
      itensAlmox: almoxItens,
      cirurgias,
      exames,
      iras,
      taxaIRAS: totalPacientes > 0 ? Math.round((iras / totalPacientes) * 100) + "%" : "0%",
      cssd,
      ouvidoria
    };

    return NextResponse.json(relatorioData);
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
