import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({}, { status: 401 })

    const hospitalId = session.user.hospitalId

    // Resumo Geral
    const totalPacientes = await prisma.paciente.count({ where: { hospitalId } })

    // Atendimentos e Aguardando
    const aguardando = await prisma.paciente.count({
      where: { hospitalId, status: { in: ['Recepção', 'Aguardando Triagem', 'Aguardando Médico'] } },
    })

    const finalizados = await prisma.paciente.count({ where: { hospitalId, status: 'Finalizado' } })
    const pacientesAtendidos = finalizados

    // Ocupação de Leitos (Lógica real baseada na classificação de risco e ocupações)
    const ocupadosVermelha = await prisma.paciente.count({
      where: { 
        hospitalId, 
        classificacao: 'Vermelho',
        status: { notIn: ['Alta Médica', 'Evasão', 'Transferido', 'Óbito', 'Finalizado'] }
      }
    })

    const ocupadosAmarela = await prisma.paciente.count({
      where: { 
        hospitalId, 
        classificacao: 'Amarelo',
        status: { notIn: ['Alta Médica', 'Evasão', 'Transferido', 'Óbito', 'Finalizado'] }
      }
    })

    // Salas Cirúrgicas ocupadas
    const salasCirurgicas = await prisma.cirurgia.count({
      where: { hospitalId, status: 'EM_ANDAMENTO' }
    })

    // Leitos UTI Ocupados
    const leitosUti = await prisma.utiLeito.count({
      where: { hospitalId, status: 'OCUPADO' }
    })

    // Desfechos
    const altas = await prisma.paciente.count({ where: { hospitalId, status: 'Alta Médica' } })
    const evasoes = await prisma.paciente.count({ where: { hospitalId, status: 'Evasão' } })
    const transferencias = await prisma.paciente.count({ where: { hospitalId, status: 'Transferido' } })
    const obitos = await prisma.obito.count({ where: { hospitalId } })

    // Média Etária
    const pacientesComIdade = await prisma.paciente.findMany({
      where: { hospitalId, nascimento: { not: null } },
      select: { nascimento: true }
    })
    
    let mediaEtaria = 0
    if (pacientesComIdade.length > 0) {
      const hoje = new Date()
      const somaIdades = pacientesComIdade.reduce((acc, p) => {
        if (!p.nascimento) return acc
        let idade = hoje.getFullYear() - p.nascimento.getFullYear()
        const m = hoje.getMonth() - p.nascimento.getMonth()
        if (m < 0 || (m === 0 && hoje.getDate() < p.nascimento.getDate())) {
          idade--
        }
        return acc + idade
      }, 0)
      mediaEtaria = Math.round(somaIdades / pacientesComIdade.length)
    }

    return NextResponse.json({
      pacientesAtendidos,
      aguardando,
      ocupadosVermelha,
      ocupadosAmarela,
      salasCirurgicas,
      leitosUti,
      altas,
      evasoes,
      transferencias,
      mediaEtaria,
      totalPacientes,
      obitos
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({
      pacientesAtendidos: 0, aguardando: 0, ocupadosVermelha: 0, ocupadosAmarela: 0,
      salasCirurgicas: 0, leitosUti: 0, altas: 0, evasoes: 0, transferencias: 0,
      mediaEtaria: 0, totalPacientes: 0, obitos: 0
    })
  }
}
