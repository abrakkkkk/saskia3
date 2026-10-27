import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Cargo sem permissão para registrar triagens' }, { status: 403 })
    }

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const { id } = await params
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const input = body as Record<string, unknown>
    const classificacoes = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul']
    const fluxogramas = ['Dor torácica', 'Dispneia', 'Febre', 'Trauma', 'Dor abdominal', 'Cefaleia', 'Outros']
    if (typeof input.classificacao !== 'string' || !classificacoes.includes(input.classificacao)) {
      return NextResponse.json({ error: 'Selecione uma classificação de risco válida' }, { status: 400 })
    }
    const classificacao = input.classificacao
    if (input.fluxograma && (typeof input.fluxograma !== 'string' || !fluxogramas.includes(input.fluxograma))) {
      return NextResponse.json({ error: 'Fluxograma inválido' }, { status: 400 })
    }
    if (input.avpu && (typeof input.avpu !== 'string' || !['A', 'V', 'P', 'U'].includes(input.avpu))) {
      return NextResponse.json({ error: 'Nível de consciência inválido' }, { status: 400 })
    }
    const fluxograma = typeof input.fluxograma === 'string' ? input.fluxograma : null
    const avpu = typeof input.avpu === 'string' ? input.avpu : null
    const numericInput = (key: string, integer: boolean) => {
      const value = input[key]
      if (value === undefined || value === null || value === '') return { valid: true as const, value: null }
      if (typeof value !== 'string' && typeof value !== 'number') return { valid: false as const, value: null }
      const text = String(value)
      const pattern = integer ? /^\d+$/ : /^\d+(?:\.\d+)?$/
      if (!pattern.test(text)) return { valid: false as const, value: null }
      const number = Number(text)
      if (!Number.isFinite(number) || number < 0 || (integer && !Number.isSafeInteger(number))) return { valid: false as const, value: null }
      return { valid: true as const, value: number }
    }
    const temperature = numericInput('temperatura', false)
    const frequencyC = numericInput('frequenciaC', true)
    const frequencyR = numericInput('frequenciaR', true)
    const saturation = numericInput('saturacao', true)
    const glucose = numericInput('glicemia', true)
    if ([temperature, frequencyC, frequencyR, saturation, glucose].some(value => !value.valid)) {
      return NextResponse.json({ error: 'Um ou mais sinais vitais têm formato numérico inválido' }, { status: 400 })
    }
    const pressao = input.pressao
    if (pressao !== undefined && pressao !== null && pressao !== '' && (typeof pressao !== 'string' || !/^\s*\d{1,3}\s*\/\s*\d{1,3}\s*$/.test(pressao))) {
      return NextResponse.json({ error: 'Pressão arterial deve estar no formato sistólica/diastólica' }, { status: 400 })
    }
    
    // Security: Check if patient exists and belongs to the user's hospital
    const pacienteExistente = await prisma.paciente.findFirst({
      where: { id, hospitalId }
    })
    
    if (!pacienteExistente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }
    
    // Transaction to ensure both triage creation and patient status update succeed
    const triagem = await prisma.$transaction(async (tx) => {
      const novaTriagem = await tx.triagem.create({
        data: {
          pacienteId: id,
          classificacao,
          fluxograma,
          avpu,
          pressao: typeof pressao === 'string' ? pressao.trim() : null,
          temperatura: temperature.value,
          frequenciaC: frequencyC.value,
          frequenciaR: frequencyR.value,
          saturacao: saturation.value,
          glicemia: glucose.value,
          queixa: typeof input.queixa === 'string' ? input.queixa : null,
          observacoes: typeof input.observacoes === 'string' ? input.observacoes : null,
          profissional: session.user?.name || 'Sistema',
          usuarioId: session.user?.id || null
        }
      })
      
      // Workflow: Advance the patient's status to "Aguardando Médico"
      // and update the priority class to match the triage
      const pacienteAtualizado = await tx.paciente.updateMany({
        where: { id, hospitalId },
        data: { 
          status: 'Aguardando Médico',
          classificacao
        }
      })
      if (pacienteAtualizado.count === 0) throw new Error('Paciente não encontrado')
      
      return novaTriagem
    })
    
    return NextResponse.json(triagem)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar triagem' }, { status: 500 })
  }
}
