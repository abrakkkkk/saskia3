import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    const body = await request.json()
    
    // Security: Check if patient exists and belongs to the user's hospital
    const pacienteExistente = await prisma.paciente.findFirst({
      where: { id, hospitalId }
    })
    
    if (!pacienteExistente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }
    
    // Determine the type of evolution based on user's role or body (fallback to SOAP)
    let tipoEvolucao = body.tipo || 'SOAP'
    if (!body.tipo && session.user?.cargo) {
       if (session.user.cargo === 'MEDICO') tipoEvolucao = 'Evolução Médica'
       else if (session.user.cargo === 'ENFERMEIRO_ASSISTENCIAL') tipoEvolucao = 'Evolução de Enfermagem'
    }

    const evolucao = await prisma.evolucao.create({
      data: {
        pacienteId: id,
        tipo: tipoEvolucao,
        descricao: body.descricao,
        profissional: session.user?.name || 'Sistema',
        usuarioId: session.user?.id || null
      }
    })
    
    return NextResponse.json(evolucao)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar evolução' }, { status: 500 })
  }
}
