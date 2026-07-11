import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    
    const exame = await prisma.exame.create({
      data: {
        pacienteId: id,
        hospitalId: session.user.hospitalId || session.user.id,
        tipo: 'Laboratorial',
        nome: body.nome,
        resultado: body.resultado,
        status: 'SOLICITADO',
        profissional: session.user?.name || 'Sistema'
      }
    })
    
    return NextResponse.json(exame)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar exame' }, { status: 500 })
  }
}
