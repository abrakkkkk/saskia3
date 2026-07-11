import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    
    const evolucao = await prisma.evolucao.create({
      data: {
        pacienteId: id,
        tipo: 'SOAP',
        descricao: body.descricao,
        profissional: session.user?.name || 'Sistema'
      }
    })
    
    return NextResponse.json(evolucao)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar evolução' }, { status: 500 })
  }
}
