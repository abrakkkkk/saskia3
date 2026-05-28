import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({}, { status: 401 })

    const hospitalId = (session.user as any).hospitalId

    const totalPacientes = await prisma.paciente.count ({ where: { hospitalId } })

    const aguardando = await prisma.paciente.count ({
      where: { hospitalId, status: { in: ['Recepção', 'Aguardando Triagem', 'Aguardando Médico'] } },
    })
    const emAtendimento = await prisma.paciente.count ({
      where: { hospitalId, status: { in: ['Em Triagem', 'Em Atendimento Médico'] } },
    })
  
    const finalizados = await prisma.paciente.count ({ where: { hospitalId, status: 'Finalizado' } })
    const internados = await prisma.paciente.count ({ where: { hospitalId, status: 'Internado' } })
    const altas = await prisma.paciente.count ({ where: { hospitalId, status: 'Alta Médica' } })
    const evasoes = await prisma.paciente.count ({ where: { hospitalId, status: 'Evasão' } })
    const obitos = await prisma.paciente.count ({ where: { hospitalId, status: 'Óbito' } })
    const transferencias = await prisma.paciente.count ({ where: { hospitalId, status: 'Transferido' } })
    const retorno = await prisma.paciente.count ({ where: { hospitalId, status: 'Retorno' } })

    return NextResponse.json ({
      totalPacientes, aguardando, emAtendimento, finalizados,
      internados, altas, evasoes, obitos, transferencias, retorno,
    })
  } catch {
    return NextResponse.json ({
      totalPacientes: 0, aguardando: 0, emAtendimento: 0, finalizados: 0,
      internados: 0, altas: 0, evasoes: 0, obitos: 0, transferencias: 0, retorno: 0,
    })
  }
}
