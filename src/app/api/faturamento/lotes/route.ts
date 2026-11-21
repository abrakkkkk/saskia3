import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { GUIAS_TISS, competenciaValida } from '@/lib/faturamento/dominios'
import {
  INCLUDE_CONTA_ARQUIVO, SERIALIZAVEL, aihDaConta, falha, guiaTissDaConta, linhasBpa, pendenciasSus, pendenciasTiss, proximoNumeroLote,
  respostaErro, respostaFalha, type ContaArquivo,
} from '@/lib/faturamento/servidor'
import { ErroTiss, gerarLoteTiss } from '@/lib/faturamento/tiss'
import { ErroSus, gerarArquivoAih, gerarBpa } from '@/lib/faturamento/sus'

const SELECT_LOTE = {
  id: true, tipo: true, numero: true, competencia: true, tipoGuia: true, status: true, arquivoNome: true, hash: true,
  quantidadeContas: true, valorTotal: true, protocolo: true, enviadoEm: true, geradoPorNome: true, createdAt: true,
  operadora: { select: { id: true, nome: true } },
} as const

export async function GET() {
  try {
    const { ator, negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const lotes = await prisma.loteFaturamento.findMany({
      where: { hospitalId: ator.hospitalId }, orderBy: { createdAt: 'desc' }, take: LIMITE_LISTA, select: SELECT_LOTE,
    })
    return NextResponse.json(lotes)
  } catch (error) {
    return respostaErro(error, 'listar lotes')
  }
}

const listaPendencias = (contas: ContaArquivo[], f: (c: ContaArquivo) => string[]) =>
  contas.map(c => ({ c, p: f(c) })).filter(x => x.p.length).slice(0, 5).map(x => `conta ${x.c.numero}: ${x.p.join(', ')}`).join('; ')

// Gera o arquivo: { tipo: 'TISS', operadoraId, tipoGuia } ou { tipo: 'BPA' | 'AIH', competencia }.
// Entram todas as contas FECHADAS do recorte (TISS: até 100 por lote, limite do padrão).
export async function POST(request: Request) {
  try {
    const { ator, negado } = await exigir('faturamento:gerir')
    if (negado) return negado
    const corpo = await lerJson(request)
    const tipo = corpo?.tipo
    if (tipo !== 'TISS' && tipo !== 'BPA' && tipo !== 'AIH') return respostaFalha(falha('Tipo de lote inválido'))

    const [config, hospital] = await Promise.all([
      prisma.configFaturamento.findUnique({ where: { hospitalId: ator.hospitalId } }),
      prisma.hospital.findUnique({ where: { id: ator.hospitalId }, select: { nome: true, cnpj: true } }),
    ])
    if (!config?.cnes) return respostaFalha(falha('Cadastre o CNES do hospital na configuração do faturamento', 422))
    if (!hospital) return respostaFalha(falha('Hospital não encontrado', 404))
    const cnes = config.cnes

    const resultado = await prisma.$transaction(async tx => {
      let where: Prisma.ContaFaturamentoWhereInput
      let operadora: { id: string; codigoAns: string; codigoPrestador: string | null } | null = null
      let competencia: string | null = null
      let tipoGuia: string | null = null
      if (tipo === 'TISS') {
        tipoGuia = typeof corpo?.tipoGuia === 'string' && (GUIAS_TISS as readonly string[]).includes(corpo.tipoGuia) ? corpo.tipoGuia : null
        const operadoraId = typeof corpo?.operadoraId === 'string' ? corpo.operadoraId : ''
        if (!tipoGuia || !operadoraId) return falha('Escolha o convênio e o tipo de guia')
        operadora = await tx.operadoraPlano.findFirst({ where: { id: operadoraId, hospitalId: ator.hospitalId }, select: { id: true, codigoAns: true, codigoPrestador: true } })
        if (!operadora) return falha('Convênio não encontrado', 404)
        where = { hospitalId: ator.hospitalId, status: 'FECHADA', fonte: 'CONVENIO', operadoraId, tipoGuia }
      } else {
        competencia = competenciaValida(corpo?.competencia) ? corpo.competencia : null
        if (!competencia) return falha('Informe a competência (AAAAMM)')
        where = { hospitalId: ator.hospitalId, status: 'FECHADA', fonte: 'SUS', competencia, tipoGuia: tipo === 'AIH' ? 'AIH' : { in: ['BPA_C', 'BPA_I'] } }
      }
      const contas = await tx.contaFaturamento.findMany({ where, include: INCLUDE_CONTA_ARQUIVO, orderBy: { numero: 'asc' }, take: tipo === 'TISS' ? 100 : 5000 })
      if (!contas.length) return falha('Nenhuma conta fechada para este recorte', 422)

      const numero = await proximoNumeroLote(tx, ator.hospitalId, tipo)
      let conteudo: string
      let hash: string | null = null
      let arquivoNome: string
      if (tipo === 'TISS') {
        const pend = listaPendencias(contas, pendenciasTiss)
        if (pend) return falha(`Contas incompletas: ${pend}`, 422)
        const r = gerarLoteTiss({
          numeroLote: String(numero), sequencialTransacao: String(numero), dataHora: new Date(),
          prestador: { cnpj: hospital.cnpj, codigoNaOperadora: operadora!.codigoPrestador, cnes },
          registroAns: operadora!.codigoAns, guias: contas.map(guiaTissDaConta),
        })
        conteudo = r.xml
        hash = r.hash
        arquivoNome = `${String(numero).padStart(6, '0')}_${r.hash}.xml`
      } else {
        const pend = listaPendencias(contas, pendenciasSus)
        if (pend) return falha(`Contas incompletas: ${pend}`, 422)
        if (tipo === 'BPA') {
          if (!config.orgaoDestinoNome) return falha('Informe o órgão de destino do BPA na configuração do faturamento', 422)
          const { consolidado, individualizado } = linhasBpa(contas, cnes)
          conteudo = gerarBpa({
            competencia: competencia!, orgaoOrigemNome: config.orgaoOrigemNome || hospital.nome, orgaoOrigemSigla: config.orgaoOrigemSigla || '',
            cnpjCpf: hospital.cnpj, orgaoDestinoNome: config.orgaoDestinoNome, orgaoDestinoTipo: config.orgaoDestinoTipo === 'E' ? 'E' : 'M',
          }, consolidado, individualizado)
          arquivoNome = `BPA_${cnes}_${competencia}.txt`
        } else {
          if (!config.municipioIbge || !config.uf || !config.orgaoEmissorAih) return falha('Informe município (IBGE), UF e órgão emissor da AIH na configuração', 422)
          const cfg = { cnes, municipioIbge: config.municipioIbge, uf: config.uf, orgaoEmissorAih: config.orgaoEmissorAih }
          conteudo = gerarArquivoAih(contas.map(c => aihDaConta(c, cfg, competencia!)))
          arquivoNome = `AIH_${cnes}_${competencia}.txt`
        }
      }
      const total = contas.reduce((s, c) => s.plus(c.valorTotal), new Prisma.Decimal(0))
      const lote = await tx.loteFaturamento.create({
        data: {
          hospitalId: ator.hospitalId, tipo, numero, operadoraId: operadora?.id ?? null, competencia, tipoGuia, arquivoNome, arquivoConteudo: conteudo, hash,
          quantidadeContas: contas.length, valorTotal: total, geradoPorId: ator.id, geradoPorNome: ator.nome,
        },
        select: SELECT_LOTE,
      })
      await tx.contaFaturamento.updateMany({ where: { id: { in: contas.map(c => c.id) }, status: 'FECHADA' }, data: { status: 'EM_LOTE', loteId: lote.id } })
      return lote
    }, { ...SERIALIZAVEL, timeout: 30_000 })

    if ('erro' in resultado) return respostaFalha(resultado)
    await auditar(ator, 'faturamento.lote.gerar', 'LoteFaturamento', resultado.id, { tipo, numero: resultado.numero, contas: resultado.quantidadeContas })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    if (error instanceof ErroTiss || error instanceof ErroSus) return respostaFalha(falha(error.message, 422))
    return respostaErro(error, 'gerar lote')
  }
}
