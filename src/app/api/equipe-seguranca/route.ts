import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const ocorrencias = await prisma.ocorrenciaSeguranca.findMany({
      where: { hospitalId },
      orderBy: { dataHora: 'desc' },
    })

    return NextResponse.json(ocorrencias)
  } catch (error) {
    console.error('Erro ao buscar registros de segurança:', error)
    return NextResponse.json({ error: 'Erro ao buscar registros de segurança' }, { status: 500 })
  }
}
