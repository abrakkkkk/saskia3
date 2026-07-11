import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const hospitalId = session.user.hospitalId;
    const { searchParams } = new URL(request.url);
    const inicioStr = searchParams.get('inicio');
    const fimStr = searchParams.get('fim');

    const startDate = inicioStr ? new Date(`${inicioStr}T00:00:00Z`) : new Date(0);
    const endDate = fimStr ? new Date(`${fimStr}T23:59:59Z`) : new Date();

    // Consultas paralelas para os relatórios
    const [
      pacientes, 
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
      prisma.paciente.findMany({ where: { hospitalId } }),
      prisma.utiLeito.findMany({ where: { hospitalId } }),
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
    const atendimentos = pacientes.filter(p => p.status === "Finalizado" || p.status === "Alta Médica" || p.status === "Alta").length;
    const internacoes = pacientes.filter(p => p.status === "Internado").length;
    const altas = pacientes.filter(p => p.status === "Alta" || p.status === "Alta Médica").length;

    const relatorioData = {
      totalPacientes: pacientes.length,
      atendimentos,
      internacoes,
      altas,
      obitos: obitos,
      taxaUTI: utiLeitos.length > 0 ? Math.round((utiOcupados / utiLeitos.length) * 100) + "%" : "0%",
      tmp: "3.2", // Placeholder
      dispensacoes: movimentacoes,
      itensAlmox: almoxItens,
      cirurgias,
      exames,
      transfusoes: 0, // Placeholder
      iras,
      taxaIRAS: pacientes.length > 0 ? Math.round((iras / pacientes.length) * 100) + "%" : "0%",
      hm: "85%", // Placeholder 
      cssd,
      ouvidoria
    };

    return NextResponse.json(relatorioData);
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
