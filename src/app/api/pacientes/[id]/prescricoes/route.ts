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
    
    // Verifica se o paciente pertence ao hospital
    const pacienteExistente = await prisma.paciente.findFirst({
      where: { id, hospitalId }
    })
    
    if (!pacienteExistente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }
    
    const prescricao = await prisma.prescricao.create({
      data: {
        pacienteId: id,
        medicamento: body.medicamento,
        dose: body.dose,
        via: body.via,
        frequencia: body.frequencia,
        profissional: session.user?.name || 'Sistema',
        usuarioId: session.user?.id || null
      }
    })
    
    return NextResponse.json(prescricao)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar prescrição' }, { status: 500 })
  }
}
