import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { findPatientInHospital } from '@/lib/pacientes'
import { isRecord } from '@/lib/request-validation'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Cargo sem permissão para registrar evolução clínica' }, { status: 403 })
    }

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const { id } = await params
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!isRecord(body) || typeof body.descricao !== 'string' || !body.descricao.trim() || body.descricao.length > 5000) {
      return NextResponse.json({ error: 'Descrição da evolução é obrigatória' }, { status: 400 })
    }
    
    // Security: Check if patient exists and belongs to the user's hospital
    if (!await findPatientInHospital(id, hospitalId)) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }
    
    // Determine the type of evolution based on user's role or body (fallback to SOAP)
    const tipoEvolucao = session.user.cargo === 'MEDICO' ? 'Evolução Médica' : 'Evolução de Enfermagem'

    const evolucao = await prisma.evolucao.create({
      data: {
        pacienteId: id,
        tipo: tipoEvolucao,
        descricao: body.descricao.trim(),
        profissional: session.user?.name || 'Sistema',
        usuarioId: session.user?.id || null
      }
    })
    
    return NextResponse.json(evolucao)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar evolução' }, { status: 500 })
  }
}
