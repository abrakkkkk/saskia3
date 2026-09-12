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
    
    // Transaction to ensure both triage creation and patient status update succeed
    const triagem = await prisma.$transaction(async (tx) => {
      const novaTriagem = await tx.triagem.create({
        data: {
          pacienteId: id,
          classificacao: body.classificacao,
          pressao: body.pressao,
          temperatura: body.temperatura ? parseFloat(body.temperatura) : null,
          frequenciaC: body.frequenciaC ? parseInt(body.frequenciaC) : null,
          frequenciaR: body.frequenciaR ? parseInt(body.frequenciaR) : null,
          saturacao: body.saturacao ? parseInt(body.saturacao) : null,
          glicemia: body.glicemia ? parseInt(body.glicemia) : null,
          queixa: body.queixa,
          observacoes: body.observacoes,
          profissional: session.user?.name || 'Sistema',
          usuarioId: session.user?.id || null
        }
      })
      
      // Workflow: Advance the patient's status to "Aguardando Médico"
      // and update the priority class to match the triage
      await tx.paciente.update({
        where: { id },
        data: { 
          status: 'Aguardando Médico',
          classificacao: body.classificacao
        }
      })
      
      return novaTriagem
    })
    
    return NextResponse.json(triagem)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar triagem' }, { status: 500 })
  }
}
