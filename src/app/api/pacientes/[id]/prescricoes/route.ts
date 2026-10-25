import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'MEDICO') return NextResponse.json({ error: 'Apenas médicos podem registrar prescrições' }, { status: 403 })

    const hospitalId = session.user.hospitalId
    const usuarioId = session.user.id
    if (!hospitalId || !usuarioId) return NextResponse.json({ error: 'Hospital ou usuário não identificado' }, { status: 403 })
    const { id } = await params
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!isRecord(body) || typeof body.medicamento !== 'string' || !body.medicamento.trim() || body.medicamento.length > 200 ||
      (body.dose !== undefined && body.dose !== null && (typeof body.dose !== 'string' || body.dose.length > 200)) ||
      (body.via !== undefined && body.via !== null && (typeof body.via !== 'string' || body.via.length > 100)) ||
      (body.frequencia !== undefined && body.frequencia !== null && (typeof body.frequencia !== 'string' || body.frequencia.length > 200))) {
      return NextResponse.json({ error: 'Dados da prescrição inválidos' }, { status: 400 })
    }
    
    // Verifica se o paciente pertence ao hospital
    const pacienteExistente = await prisma.paciente.findFirst({
      where: { id, hospitalId }
    })
    
    if (!pacienteExistente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }
    
    const prescricao = await prisma.prescricao.create({
      data: {
        pacienteId: id,
        medicamento: body.medicamento.trim(),
        dose: typeof body.dose === 'string' ? body.dose.trim() : null,
        via: typeof body.via === 'string' ? body.via.trim() : null,
        frequencia: typeof body.frequencia === 'string' ? body.frequencia.trim() : null,
        profissional: session.user.name || session.user.email || 'Profissional autenticado',
        usuarioId
      }
    })
    
    return NextResponse.json(prescricao)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar prescrição' }, { status: 500 })
  }
}
