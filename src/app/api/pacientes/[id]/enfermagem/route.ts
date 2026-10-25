import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { findPatientInHospital } from '@/lib/pacientes'
import { isRecord } from '@/lib/request-validation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!['ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Cargo sem permissão para registrar anotações de enfermagem' }, { status: 403 })
    }

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    if (!await findPatientInHospital(id, hospitalId)) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const data: Record<string, string | null> = {}
    for (const field of ['responsavel', 'coren', 'evolucao', 'prescricao']) {
      const value = body[field]
      if (value === undefined) continue
      if (value !== null && (typeof value !== 'string' || value.length > 5000)) {
        return NextResponse.json({ error: `Valor inválido para ${field}` }, { status: 400 })
      }
      data[field] = value as string | null
    }

    const item = await prisma.anotacaoEnfermagem.create({
      data: { ...data, pacienteId: id, profissional: session.user.name || 'Sistema' }
    })

    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
