import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    
    const prescricao = await prisma.prescricao.create({
      data: {
        pacienteId: id,
        medicamento: body.medicamento,
        dose: body.dose,
        via: body.via,
        frequencia: body.frequencia,
        profissional: session.user?.name || 'Sistema'
      }
    })
    
    return NextResponse.json(prescricao)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar prescrição' }, { status: 500 })
  }
}
