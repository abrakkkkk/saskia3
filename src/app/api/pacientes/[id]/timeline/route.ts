import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { findPatientInHospital } from '@/lib/pacientes'
import { isRecord } from '@/lib/request-validation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    if (!await findPatientInHospital(id, hospitalId)) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!isRecord(body) || typeof body.tipo !== 'string' || !body.tipo.trim() || body.tipo.length > 100 || typeof body.descricao !== 'string' || !body.descricao.trim() || body.descricao.length > 5000) {
      return NextResponse.json({ error: 'Tipo e descrição válidos são obrigatórios' }, { status: 400 })
    }

    const item = await prisma.timelineEvent.create({
      data: { tipo: body.tipo.trim(), descricao: body.descricao.trim(), pacienteId: id, user: session.user.name || 'Sistema' }
    })

    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
