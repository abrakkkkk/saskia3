import { NextRequest, NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { pode } from '@/lib/permissions'
import { ehFalha, encerrar, SAIDAS_MEDICAS, SELECT_INTERNACAO, trocarLeito, validarDestino, validarSaida } from '@/lib/internacao'
import { respostaErro, respostaFalha, SERIALIZAVEL } from '@/lib/internacao-api'

type Contexto = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Contexto) {
  try {
    const { ator, negado } = await exigir('internacao:ler')
    if (negado) return negado
    const { id } = await params
    const internacao = await prisma.internacao.findFirst({ where: { id, hospitalId: ator.hospitalId }, select: SELECT_INTERNACAO })
    if (!internacao) return NextResponse.json({ error: 'Internação não encontrada' }, { status: 404 })
    return NextResponse.json(internacao)
  } catch (error) {
    return respostaErro(error, 'ler a internação')
  }
}

// PATCH { acao: 'trocar-leito', setor, leito?, utiLeitoId?, motivo? }
//       { acao: 'encerrar', tipoSaida, destinoTransferencia?, motivoSaida?, saidaEm? }
export async function PATCH(request: NextRequest, { params }: Contexto) {
  try {
    const { ator, negado } = await exigir('internacao:gerir')
    if (negado) return negado
    const { id } = await params
    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const { hospitalId } = ator

    const atual = await prisma.internacao.findFirst({ where: { id, hospitalId }, select: { id: true, utiLeitoId: true } })
    if (!atual) return NextResponse.json({ error: 'Internação não encontrada' }, { status: 404 })

    if (input.acao === 'trocar-leito') {
      const destino = validarDestino(input)
      if (ehFalha(destino)) return respostaFalha(destino)
      if ((destino.utiLeitoId || atual.utiLeitoId) && !pode(ator.cargo, 'uti:gerir')) {
        return NextResponse.json({ error: 'Somente médico ou enfermeiro movimenta leito de UTI' }, { status: 403 })
      }
      const motivo = typeof input.motivo === 'string' ? input.motivo.trim().slice(0, 2000) || null : null
      const resultado = await prisma.$transaction(tx => trocarLeito(tx, ator, id, destino, motivo), SERIALIZAVEL)
      if (ehFalha(resultado)) return respostaFalha(resultado)
      await auditar(ator, 'internacao.trocar_leito', 'Internacao', id, {
        pacienteId: resultado.pacienteId, setor: destino.setor, leito: destino.leito, utiLeitoId: destino.utiLeitoId,
      })
    } else if (input.acao === 'encerrar') {
      const dados = validarSaida(input)
      if (ehFalha(dados)) return respostaFalha(dados)
      if (SAIDAS_MEDICAS.includes(dados.tipoSaida) && !pode(ator.cargo, 'prontuario:desfecho')) {
        return NextResponse.json({ error: 'Somente o médico registra alta ou transferência' }, { status: 403 })
      }
      if (atual.utiLeitoId && !pode(ator.cargo, 'uti:gerir')) {
        return NextResponse.json({ error: 'Somente médico ou enfermeiro libera leito de UTI' }, { status: 403 })
      }
      const resultado = await prisma.$transaction(tx => encerrar(tx, ator, id, dados), SERIALIZAVEL)
      if (ehFalha(resultado)) return respostaFalha(resultado)
      await auditar(ator, 'internacao.encerrar', 'Internacao', id, {
        pacienteId: resultado.pacienteId, tipoSaida: dados.tipoSaida, destino: dados.destinoTransferencia,
        status: { de: resultado.statusAnterior, para: resultado.status },
      })
    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    return NextResponse.json(await prisma.internacao.findFirst({ where: { id, hospitalId }, select: SELECT_INTERNACAO }))
  } catch (error) {
    return respostaErro(error, 'atualizar a internação')
  }
}
