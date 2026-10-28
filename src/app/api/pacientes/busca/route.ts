import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const pacientes = await prisma.paciente.findMany({
      where: { hospitalId, arquivadoEm: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        cpf: true,
        nascimento: true,
        sexo: true,
        telefone: true,
        endereco: true,
        mae: true,
        status: true,
        classificacao: true,
      },
    })

    return NextResponse.json(pacientes, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Erro ao buscar pacientes para a pesquisa avançada:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
  }
}
