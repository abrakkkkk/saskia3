import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { CLASSIFICACOES, pacienteAtivo, registrarEvento, textoOpcional } from '@/lib/pacientes'

const FLUXOGRAMAS = ['Dor torácica', 'Dispneia', 'Febre', 'Trauma', 'Dor abdominal', 'Cefaleia', 'Outros']
// Nesses estados a triagem é registrada, mas não devolve o paciente à fila médica.
const STATUS_SEM_AVANCO = ['Internado', 'Internado - UTI', 'Alta Médica', 'Transferido', 'Evasão']

function numero(input: Record<string, unknown>, chave: string, inteiro: boolean) {
  const valor = input[chave]
  if (valor === undefined || valor === null || valor === '') return { valido: true as const, valor: null }
  if (typeof valor !== 'string' && typeof valor !== 'number') return { valido: false as const, valor: null }
  const texto = String(valor)
  if (!(inteiro ? /^\d+$/ : /^\d+(?:\.\d+)?$/).test(texto)) return { valido: false as const, valor: null }
  const convertido = Number(texto)
  if (!Number.isFinite(convertido) || (inteiro && !Number.isSafeInteger(convertido))) return { valido: false as const, valor: null }
  return { valido: true as const, valor: convertido }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ator, negado } = await exigir('triagem:registrar')
    if (negado) return negado
    const { id } = await params
    const { paciente, bloqueio } = await pacienteAtivo(id, ator.hospitalId)
    if (bloqueio) return bloqueio

    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const classificacao = input.classificacao
    if (typeof classificacao !== 'string' || !CLASSIFICACOES.includes(classificacao)) {
      return NextResponse.json({ error: 'Selecione uma classificação de risco válida' }, { status: 400 })
    }
    if (input.fluxograma && (typeof input.fluxograma !== 'string' || !FLUXOGRAMAS.includes(input.fluxograma))) {
      return NextResponse.json({ error: 'Fluxograma inválido' }, { status: 400 })
    }
    if (input.avpu && (typeof input.avpu !== 'string' || !['A', 'V', 'P', 'U'].includes(input.avpu))) {
      return NextResponse.json({ error: 'Nível de consciência inválido' }, { status: 400 })
    }

    const temperatura = numero(input, 'temperatura', false)
    const frequenciaC = numero(input, 'frequenciaC', true)
    const frequenciaR = numero(input, 'frequenciaR', true)
    const saturacao = numero(input, 'saturacao', true)
    const glicemia = numero(input, 'glicemia', true)
    if ([temperatura, frequenciaC, frequenciaR, saturacao, glicemia].some(item => !item.valido)) {
      return NextResponse.json({ error: 'Um ou mais sinais vitais têm formato numérico inválido' }, { status: 400 })
    }
    const pressao = input.pressao
    if (pressao !== undefined && pressao !== null && pressao !== '' && (typeof pressao !== 'string' || !/^\s*\d{1,3}\s*\/\s*\d{1,3}\s*$/.test(pressao))) {
      return NextResponse.json({ error: 'Pressão arterial deve estar no formato sistólica/diastólica' }, { status: 400 })
    }
    const queixa = textoOpcional(input.queixa, 5000)
    const observacoes = textoOpcional(input.observacoes, 5000)
    if (queixa === undefined || observacoes === undefined) return NextResponse.json({ error: 'Texto da triagem inválido' }, { status: 400 })

    const avancaStatus = !STATUS_SEM_AVANCO.includes(paciente.status)
    const triagem = await prisma.$transaction(async tx => {
      const nova = await tx.triagem.create({
        data: {
          pacienteId: id,
          classificacao,
          fluxograma: typeof input.fluxograma === 'string' ? input.fluxograma : null,
          avpu: typeof input.avpu === 'string' && input.avpu ? input.avpu : null,
          pressao: typeof pressao === 'string' ? pressao.trim() || null : null,
          temperatura: temperatura.valor,
          frequenciaC: frequenciaC.valor,
          frequenciaR: frequenciaR.valor,
          saturacao: saturacao.valor,
          glicemia: glicemia.valor,
          queixa,
          observacoes,
          profissional: ator.nome,
          usuarioId: ator.id,
        },
      })
      await tx.paciente.updateMany({
        where: { id, hospitalId: ator.hospitalId, arquivadoEm: null },
        data: { classificacao, ...(avancaStatus ? { status: 'Aguardando Médico' } : {}) },
      })
      await registrarEvento(tx, ator, id, 'Triagem', `Classificação: ${classificacao}`)
      return nova
    })

    await auditar(ator, 'REGISTRAR_TRIAGEM', 'Triagem', triagem.id, { pacienteId: id, classificacao })
    return NextResponse.json(triagem, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar triagem:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar triagem' }, { status: 500 })
  }
}
