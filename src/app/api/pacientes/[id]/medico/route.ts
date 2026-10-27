import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'MEDICO') return NextResponse.json({ error: 'Apenas médicos podem registrar avaliações médicas' }, { status: 403 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const input = body as Record<string, unknown>
    const paciente = await prisma.paciente.findFirst({
      where: { id, hospitalId, arquivadoEm: null },
      select: { id: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const profissional = session.user.name || 'Sistema'

    const item = await prisma.avaliacaoMedica.create({
      data: {
        pacienteId: id,
        responsavel: typeof input.responsavel === 'string' ? input.responsavel : session.user.name || 'Médico',
        crm: typeof input.crm === 'string' ? input.crm : null,
        especialidade: typeof input.especialidade === 'string' ? input.especialidade : null,
        diagnostico: typeof input.diagnostico === 'string' ? input.diagnostico : null,
        conduta: typeof input.conduta === 'string' ? input.conduta : null,
        profissional,
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
