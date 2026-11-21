import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { GUIAS_SUS, GUIAS_TISS, STATUS_CONTA, competenciaDe, competenciaValida } from '@/lib/faturamento/dominios'
import {
  SERIALIZAVEL, conselhoTiss, ehFalha, falha, lerCamposConta, motivoDaSaida, proximoNumeroConta, respostaErro, respostaFalha,
} from '@/lib/faturamento/servidor'

export const SELECT_LISTA_CONTA = {
  id: true, numero: true, fonte: true, tipoGuia: true, status: true, competencia: true, dataAtendimento: true, dataFim: true,
  valorTotal: true, valorGlosado: true, valorPago: true, loteId: true, internacaoId: true,
  paciente: { select: { id: true, nome: true } },
  operadora: { select: { id: true, nome: true } },
  _count: { select: { itens: true } },
} as const

// GET ?status=&fonte=&competencia=&operadoraId=&q=
export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const p = request.nextUrl.searchParams
    const status = p.get('status')
    const fonte = p.get('fonte')
    const competencia = p.get('competencia')
    const operadoraId = p.get('operadoraId')
    const q = (p.get('q') ?? '').trim().slice(0, 80)
    const contas = await prisma.contaFaturamento.findMany({
      where: {
        hospitalId: ator.hospitalId,
        ...(status && (STATUS_CONTA as readonly string[]).includes(status) ? { status } : {}),
        ...(fonte === 'SUS' || fonte === 'CONVENIO' ? { fonte } : {}),
        ...(competenciaValida(competencia) ? { competencia } : {}),
        ...(operadoraId ? { operadoraId } : {}),
        ...(q ? { paciente: { nome: { contains: q, mode: 'insensitive' as const } } } : {}),
      },
      orderBy: { numero: 'desc' },
      take: LIMITE_LISTA,
      select: SELECT_LISTA_CONTA,
    })
    return NextResponse.json(contas)
  } catch (error) {
    return respostaErro(error, 'listar contas')
  }
}

export async function POST(request: Request) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const corpo = await lerJson(request)
    if (!corpo) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const pacienteId = typeof corpo.pacienteId === 'string' ? corpo.pacienteId : ''
    const internacaoId = typeof corpo.internacaoId === 'string' && corpo.internacaoId ? corpo.internacaoId : null
    const operadoraId = typeof corpo.operadoraId === 'string' && corpo.operadoraId ? corpo.operadoraId : null
    const fonte = corpo.fonte === 'SUS' ? 'SUS' : corpo.fonte === 'CONVENIO' ? 'CONVENIO' : null
    const tipoGuia = typeof corpo.tipoGuia === 'string' ? corpo.tipoGuia : ''
    if (!pacienteId || !fonte) return respostaFalha(falha('Informe o paciente e a fonte pagadora'))
    const guiasDaFonte: readonly string[] = fonte === 'SUS' ? GUIAS_SUS : GUIAS_TISS
    if (!guiasDaFonte.includes(tipoGuia)) return respostaFalha(falha('Tipo de guia não combina com a fonte pagadora'))
    if ((tipoGuia === 'AIH' || tipoGuia === 'RESUMO_INTERNACAO') && !internacaoId) return respostaFalha(falha('AIH e resumo de internação partem de uma internação'))
    if (fonte === 'CONVENIO' && !operadoraId) return respostaFalha(falha('Escolha o convênio'))

    const campos = lerCamposConta(corpo)
    if (ehFalha(campos)) return respostaFalha(campos)

    const [paciente, internacao, operadora] = await Promise.all([
      prisma.paciente.findFirst({ where: { id: pacienteId, hospitalId: ator.hospitalId }, select: { id: true, numConvenio: true } }),
      internacaoId ? prisma.internacao.findFirst({
        where: { id: internacaoId, hospitalId: ator.hospitalId, pacienteId },
        select: { id: true, entradaEm: true, saidaEm: true, cid: true, tipoSaida: true, setor: true, medicoResponsavelId: true, medicoResponsavelNome: true },
      }) : null,
      operadoraId ? prisma.operadoraPlano.findFirst({ where: { id: operadoraId, hospitalId: ator.hospitalId }, select: { id: true, status: true } }) : null,
    ])
    if (!paciente) return respostaFalha(falha('Paciente não encontrado', 404))
    if (internacaoId && !internacao) return respostaFalha(falha('Internação não encontrada para este paciente', 404))
    if (operadoraId && !operadora) return respostaFalha(falha('Convênio não encontrado', 404))
    if (operadora && operadora.status !== 'ATIVO') return respostaFalha(falha('Convênio inativo'))

    // Profissional sugerido: médico responsável pela internação; sem internação, quem abre a conta, se tiver registro.
    const profissionalId = internacao?.medicoResponsavelId ?? ator.id
    const profissional = await prisma.usuario.findFirst({
      where: { id: profissionalId, hospitalId: ator.hospitalId },
      select: { id: true, nome: true, conselho: true, registroNumero: true, registroUf: true },
    })
    const comRegistro = profissional?.registroNumero ? profissional : null

    const dataAtendimento = (campos.dataAtendimento as Date | undefined) ?? internacao?.entradaEm ?? new Date()
    const dataFim = (campos.dataFim as Date | null | undefined) ?? internacao?.saidaEm ?? null
    const competencia = competenciaValida(corpo.competencia) ? corpo.competencia : competenciaDe(dataFim ?? dataAtendimento)

    const conta = await prisma.$transaction(async tx => {
      const numero = await proximoNumeroConta(tx, ator.hospitalId)
      return tx.contaFaturamento.create({
        data: {
          regimeAtendimento: internacao ? '03' : '01',
          tipoAtendimento: tipoGuia === 'SP_SADT' ? '23' : null,
          tipoConsulta: tipoGuia === 'CONSULTA' ? '1' : null,
          tipoInternacao: internacao && fonte === 'CONVENIO' ? '1' : null,
          regimeInternacao: internacao && fonte === 'CONVENIO' ? '1' : null,
          especialidadeAih: tipoGuia === 'AIH' ? (/UTI/i.test(internacao?.setor ?? '') ? '75' : '03') : null,
          motivoEncerramento: motivoDaSaida(internacao?.tipoSaida),
          cid: internacao?.cid?.toUpperCase().replace('.', '').slice(0, 4) ?? null,
          numeroCarteira: fonte === 'CONVENIO' ? paciente.numConvenio?.slice(0, 20) ?? null : null,
          profissionalId: comRegistro?.id ?? null,
          profissionalNome: comRegistro?.nome ?? internacao?.medicoResponsavelNome ?? null,
          conselho: conselhoTiss(comRegistro?.conselho),
          numeroConselho: comRegistro?.registroNumero ?? null,
          ufConselho: comRegistro?.registroUf ?? null,
          ...campos,
          hospitalId: ator.hospitalId,
          numero,
          pacienteId,
          internacaoId,
          operadoraId: fonte === 'CONVENIO' ? operadoraId : null,
          fonte,
          tipoGuia,
          competencia,
          dataAtendimento,
          dataFim,
          criadoPorId: ator.id,
          criadoPorNome: ator.nome,
        } as Prisma.ContaFaturamentoUncheckedCreateInput,
        select: { id: true, numero: true },
      })
    }, SERIALIZAVEL)
    await auditar(ator, 'faturamento.conta.criar', 'ContaFaturamento', conta.id, { numero: conta.numero, fonte, tipoGuia, pacienteId, internacaoId })
    return NextResponse.json(conta, { status: 201 })
  } catch (error) {
    return respostaErro(error, 'abrir conta')
  }
}
