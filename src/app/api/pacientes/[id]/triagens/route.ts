import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    
    const triagem = await prisma.triagem.create({
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
        profissional: session.user?.name || 'Sistema'
      }
    })
    
    return NextResponse.json(triagem)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar triagem' }, { status: 500 })
  }
}
