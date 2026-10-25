import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 160
      || (body.resultado != null && (typeof body.resultado !== 'string' || body.resultado.length > 5000))) {
      return NextResponse.json({ error: 'Dados do exame inválidos' }, { status: 400 })
    }
    const paciente = await prisma.paciente.findFirst({
      where: { id, hospitalId },
      select: { id: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const exame = await prisma.exame.create({
      data: {
        pacienteId: id,
        hospitalId,
        tipo: 'Laboratorial',
        nome: body.nome.trim(),
        resultado: typeof body.resultado === 'string' ? body.resultado.trim() : null,
        status: 'SOLICITADO',
        profissional: session.user?.name || 'Sistema'
      }
    })

    return NextResponse.json(exame, { status: 201 })
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar exame' }, { status: 500 })
  }
}
