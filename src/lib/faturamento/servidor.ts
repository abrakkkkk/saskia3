import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  CARATER_ATENDIMENTO, CONSELHOS, ESPECIALIDADE_AIH, INDICACAO_ACIDENTE, MOTIVO_ENCERRAMENTO, RACA_COR, REGIME_ATENDIMENTO,
  REGIME_INTERNACAO, TIPO_ATENDIMENTO, TIPO_CONSULTA, TIPO_INTERNACAO, UF_IBGE, codigoValido, type Opcao,
} from './dominios'
import { CBOS_TISS } from './cbos-tiss'
import type { GuiaTiss, ItemTiss } from './tiss'
import { aaaammdd, idadeEm, type Aih, type LinhaBpaC, type LinhaBpaI } from './sus'

export type Falha = { erro: string; codigo: number }
export const falha = (erro: string, codigo = 400): Falha => ({ erro, codigo })
export const ehFalha = (v: unknown): v is Falha => !!v && typeof v === 'object' && 'erro' in v && 'codigo' in v
export const respostaFalha = (f: Falha) => NextResponse.json({ error: f.erro }, { status: f.codigo })

export function respostaErro(error: unknown, contexto: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002')) {
    return NextResponse.json({ error: 'Outra pessoa alterou o faturamento ao mesmo tempo. Atualize a tela e tente de novo.' }, { status: 409 })
  }
  console.error(`Erro ao ${contexto}:`, error instanceof Error ? error.name : 'erro')
  return NextResponse.json({ error: `Erro ao ${contexto}` }, { status: 500 })
}
export const SERIALIZAVEL = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }

// ---------------------------------------------------------------- leitura de campos

type Corpo = Record<string, unknown>
/** Texto opcional: undefined = não veio (não altera); null = limpar. */
export function texto(corpo: Corpo, campo: string, max: number, padrao?: RegExp): string | null | undefined | Falha {
  const v = corpo[campo]
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (typeof v !== 'string') return falha(`Campo ${campo} inválido`)
  const t = v.trim()
  if (!t) return null
  if (t.length > max) return falha(`Campo ${campo} passa de ${max} caracteres`)
  if (padrao && !padrao.test(t)) return falha(`Campo ${campo} em formato inválido`)
  return t
}
export function opcao(corpo: Corpo, campo: string, lista: Opcao[]): string | null | undefined | Falha {
  const v = corpo[campo]
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  return codigoValido(lista, v) ? v : falha(`Valor de ${campo} fora da tabela oficial`)
}
export function data(corpo: Corpo, campo: string): Date | null | undefined | Falha {
  const v = corpo[campo]
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return falha(`Data ${campo} inválida`)
  const d = new Date(v.length === 10 ? `${v}T12:00:00-03:00` : v)
  return Number.isNaN(d.getTime()) ? falha(`Data ${campo} inválida`) : d
}

const CBO_OPCOES: Opcao[] = CBOS_TISS

/** Campos editáveis do cabeçalho da conta. Devolve só o que veio no corpo. */
export function lerCamposConta(corpo: Corpo): Prisma.ContaFaturamentoUncheckedUpdateInput | Falha {
  const dig = (n: number) => new RegExp(`^\\d{${n}}$`)
  const campos = {
    numeroCarteira: texto(corpo, 'numeroCarteira', 20),
    senhaAutorizacao: texto(corpo, 'senhaAutorizacao', 20),
    numeroGuiaOperadora: texto(corpo, 'numeroGuiaOperadora', 20),
    dataAutorizacao: data(corpo, 'dataAutorizacao'),
    dataAtendimento: data(corpo, 'dataAtendimento'),
    dataFim: data(corpo, 'dataFim'),
    cid: texto(corpo, 'cid', 6, /^[A-Za-z]\d{2}(\.?\d{0,2})?$/),
    caraterAtendimento: opcao(corpo, 'caraterAtendimento', CARATER_ATENDIMENTO),
    indicacaoAcidente: opcao(corpo, 'indicacaoAcidente', INDICACAO_ACIDENTE),
    tipoAtendimento: opcao(corpo, 'tipoAtendimento', TIPO_ATENDIMENTO),
    tipoConsulta: opcao(corpo, 'tipoConsulta', TIPO_CONSULTA),
    regimeAtendimento: opcao(corpo, 'regimeAtendimento', REGIME_ATENDIMENTO),
    motivoEncerramento: opcao(corpo, 'motivoEncerramento', MOTIVO_ENCERRAMENTO),
    tipoInternacao: opcao(corpo, 'tipoInternacao', TIPO_INTERNACAO),
    regimeInternacao: opcao(corpo, 'regimeInternacao', REGIME_INTERNACAO),
    profissionalNome: texto(corpo, 'profissionalNome', 70),
    conselho: opcao(corpo, 'conselho', CONSELHOS),
    numeroConselho: texto(corpo, 'numeroConselho', 15),
    ufConselho: texto(corpo, 'ufConselho', 2, /^[A-Za-z]{2}$/),
    cbo: opcao(corpo, 'cbo', CBO_OPCOES),
    cnsProfissional: texto(corpo, 'cnsProfissional', 15, dig(15)),
    cnsPaciente: texto(corpo, 'cnsPaciente', 15, dig(15)),
    racaCor: opcao(corpo, 'racaCor', RACA_COR),
    municipioIbgePaciente: texto(corpo, 'municipioIbgePaciente', 6, dig(6)),
    cepPaciente: texto(corpo, 'cepPaciente', 9, /^\d{5}-?\d{3}$/),
    numeroAih: texto(corpo, 'numeroAih', 13, dig(13)),
    procedimentoPrincipal: texto(corpo, 'procedimentoPrincipal', 10, dig(10)),
    especialidadeAih: opcao(corpo, 'especialidadeAih', ESPECIALIDADE_AIH),
    observacao: texto(corpo, 'observacao', 500),
  }
  const saida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(campos)) {
    if (ehFalha(v)) return v
    if (v === undefined) continue
    saida[k] = k === 'ufConselho' && typeof v === 'string' ? v.toUpperCase() : k === 'cid' && typeof v === 'string' ? v.toUpperCase().replace('.', '') : k === 'cepPaciente' && typeof v === 'string' ? v.replace('-', '') : v
  }
  if (saida.ufConselho && !UF_IBGE[saida.ufConselho as string]) return falha('UF do conselho inválida')
  if (saida.dataAtendimento === null) return falha('Data de atendimento é obrigatória')
  return saida as Prisma.ContaFaturamentoUncheckedUpdateInput
}

/** Conselho cadastrado no usuário (texto livre, ex.: "CRM") para o código TISS (tabela 26). */
export function conselhoTiss(conselho: string | null | undefined) {
  const t = (conselho ?? '').toUpperCase().replace(/[^A-Z]/g, '')
  return CONSELHOS.find(c => c.nome === t)?.codigo ?? null
}

/** Motivo de encerramento sugerido a partir da saída registrada na internação. */
export function motivoDaSaida(tipoSaida: string | null | undefined) {
  return tipoSaida === 'ALTA_MEDICA' ? '12' : tipoSaida === 'TRANSFERENCIA' ? '31' : tipoSaida === 'EVASAO' ? '16' : tipoSaida === 'OBITO' ? '41' : null
}

// ---------------------------------------------------------------- totais e numeração

export async function recalcularConta(tx: Prisma.TransactionClient, contaId: string) {
  const itens = await tx.itemConta.findMany({ where: { contaId }, select: { valorTotal: true, valorGlosado: true } })
  const total = itens.reduce((s, i) => s.plus(i.valorTotal), new Prisma.Decimal(0))
  const glosado = itens.reduce((s, i) => s.plus(i.valorGlosado), new Prisma.Decimal(0))
  await tx.contaFaturamento.update({ where: { id: contaId }, data: { valorTotal: total, valorGlosado: glosado } })
}

export async function proximoNumeroConta(tx: Prisma.TransactionClient, hospitalId: string) {
  const r = await tx.contaFaturamento.aggregate({ where: { hospitalId }, _max: { numero: true } })
  return (r._max.numero ?? 0) + 1
}
export async function proximoNumeroLote(tx: Prisma.TransactionClient, hospitalId: string, tipo: string) {
  const r = await tx.loteFaturamento.aggregate({ where: { hospitalId, tipo }, _max: { numero: true } })
  return (r._max.numero ?? 0) + 1
}

export const STATUS_EDITAVEL = new Set(['ABERTA'])

// ---------------------------------------------------------------- montagem das guias e arquivos

export const INCLUDE_CONTA_ARQUIVO = {
  itens: { orderBy: { dataExecucao: 'asc' as const } },
  paciente: { select: { id: true, nome: true, cpf: true, cns: true, nascimento: true, sexo: true, mae: true, endereco: true, telefone: true, email: true } },
} satisfies Prisma.ContaFaturamentoInclude
export type ContaArquivo = Prisma.ContaFaturamentoGetPayload<{ include: typeof INCLUDE_CONTA_ARQUIVO }>

const isoData = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
const horaBr = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d)
const n = (d: Prisma.Decimal | number) => Number(d)

/** O que falta na conta para virar guia TISS (lista vazia = pronta). */
export function pendenciasTiss(c: ContaArquivo): string[] {
  const p: string[] = []
  if (!c.numeroCarteira) p.push('número da carteira')
  if (!c.profissionalNome || !c.conselho || !c.numeroConselho || !c.ufConselho) p.push('profissional e conselho')
  if (!c.cbo) p.push('CBO do profissional')
  if (!c.itens.length) p.push('ao menos um item')
  if (c.tipoGuia === 'CONSULTA' && !c.itens.some(i => !i.codigoDespesa)) p.push('procedimento da consulta')
  if (c.tipoGuia === 'RESUMO_INTERNACAO') {
    if (!c.senhaAutorizacao || !c.dataAutorizacao) p.push('senha e data de autorização')
    if (!c.dataFim || !c.motivoEncerramento) p.push('data de saída e motivo de encerramento')
  }
  if (c.itens.some(i => i.tabela === 'SIGTAP')) p.push('itens SIGTAP não vão em guia TISS')
  return p
}

export function guiaTissDaConta(c: ContaArquivo): GuiaTiss {
  const itens: ItemTiss[] = c.itens.map(i => ({
    tabela: i.tabela, codigo: i.codigo, descricao: i.descricao, quantidade: n(i.quantidade), valorUnitario: n(i.valorUnitario), valorTotal: n(i.valorTotal),
    dataExecucao: isoData(i.dataExecucao), codigoDespesa: i.codigoDespesa, unidadeMedida: i.unidadeMedida,
  }))
  return {
    tipo: c.tipoGuia as GuiaTiss['tipo'],
    numeroGuiaPrestador: String(c.numero),
    numeroGuiaOperadora: c.numeroGuiaOperadora,
    senha: c.senhaAutorizacao,
    dataAutorizacao: c.dataAutorizacao ? isoData(c.dataAutorizacao) : null,
    numeroCarteira: c.numeroCarteira ?? '',
    dataAtendimento: isoData(c.dataAtendimento),
    dataFim: c.dataFim ? isoData(c.dataFim) : null,
    horaInicio: horaBr(c.dataAtendimento),
    horaFim: c.dataFim ? horaBr(c.dataFim) : null,
    caraterAtendimento: c.caraterAtendimento,
    indicacaoAcidente: c.indicacaoAcidente,
    tipoAtendimento: c.tipoAtendimento,
    tipoConsulta: c.tipoConsulta,
    regimeAtendimento: c.regimeAtendimento,
    motivoEncerramento: c.motivoEncerramento,
    tipoInternacao: c.tipoInternacao,
    regimeInternacao: c.regimeInternacao,
    cids: c.cid ? [c.cid] : [],
    profissional: {
      nome: c.profissionalNome ?? '', conselho: c.conselho ?? '', numeroConselho: c.numeroConselho ?? '',
      ufIbge: UF_IBGE[c.ufConselho ?? ''] ?? '', cbo: c.cbo ?? '',
    },
    observacao: c.observacao,
    itens,
  }
}

const sexoSus = (s: string | null | undefined): 'M' | 'F' | null => {
  const t = (s ?? '').trim().toUpperCase()
  return t.startsWith('M') ? 'M' : t.startsWith('F') ? 'F' : null
}

/** O que falta na conta SUS (lista vazia = pronta). */
export function pendenciasSus(c: ContaArquivo): string[] {
  const p: string[] = []
  const procs = c.itens.filter(i => i.tabela === 'SIGTAP')
  if (!procs.length && c.tipoGuia !== 'AIH') p.push('ao menos um procedimento SIGTAP')
  if (c.itens.some(i => i.tabela !== 'SIGTAP')) p.push('só itens SIGTAP entram no SUS')
  if (!c.cbo) p.push('CBO do profissional')
  if (c.tipoGuia === 'BPA_C') return p
  if (!c.cnsPaciente && !c.paciente.cns && !c.paciente.cpf) p.push('CNS ou CPF do paciente')
  if (!c.paciente.nascimento) p.push('data de nascimento do paciente')
  if (!sexoSus(c.paciente.sexo)) p.push('sexo do paciente')
  if (!c.racaCor) p.push('raça/cor do paciente')
  if (!c.cnsProfissional) p.push('CNS do profissional')
  if (c.tipoGuia === 'AIH') {
    if (!c.numeroAih) p.push('número da AIH')
    if (!c.procedimentoPrincipal) p.push('procedimento principal')
    if (!c.cid) p.push('CID principal')
    if (!c.dataFim || !c.motivoEncerramento) p.push('data de saída e motivo de saída')
    if (!c.municipioIbgePaciente || !c.cepPaciente) p.push('município (IBGE) e CEP do paciente')
    if (!c.especialidadeAih) p.push('especialidade do leito')
  }
  return p
}

export function linhasBpa(contas: ContaArquivo[], cnes: string) {
  const consolidado = new Map<string, LinhaBpaC>()
  const individualizado: LinhaBpaI[] = []
  for (const c of contas) {
    const nasc = c.paciente.nascimento
    for (const i of c.itens.filter(x => x.tabela === 'SIGTAP')) {
      const idade = nasc ? idadeEm(nasc, i.dataExecucao) : 0
      const qtd = Math.max(1, Math.round(n(i.quantidade)))
      const cbo = i.cbo || c.cbo || ''
      if (c.tipoGuia === 'BPA_C') {
        const chave = `${cbo}|${i.codigo}|${idade}`
        const atual = consolidado.get(chave)
        if (atual) atual.quantidade += qtd
        else consolidado.set(chave, { cnes, competencia: c.competencia, cbo, procedimento: i.codigo, idade, quantidade: qtd })
        continue
      }
      individualizado.push({
        cnes, competencia: c.competencia, cnsProfissional: c.cnsProfissional ?? '', cbo, dataAtendimento: aaaammdd(i.dataExecucao), procedimento: i.codigo,
        cnsPaciente: c.cnsPaciente ?? c.paciente.cns, cpfPaciente: c.paciente.cpf, sexo: sexoSus(c.paciente.sexo) ?? 'F', municipioIbge: c.municipioIbgePaciente, cid: c.cid,
        idade, quantidade: qtd, caraterAtendimento: c.caraterAtendimento === '2' ? '02' : '01', nomePaciente: c.paciente.nome,
        dataNascimento: nasc ? aaaammdd(nasc) : '', racaCor: c.racaCor ?? '99', cep: c.cepPaciente, endereco: c.paciente.endereco,
        telefone: c.paciente.telefone, email: c.paciente.email,
      })
    }
  }
  return { consolidado: [...consolidado.values()], individualizado }
}

export function aihDaConta(c: ContaArquivo, cfg: { cnes: string; municipioIbge: string; uf: string; orgaoEmissorAih: string }, competencia: string): Aih {
  return {
    competenciaApresentacao: competencia,
    orgaoEmissor: cfg.orgaoEmissorAih,
    cnes: cfg.cnes,
    municipioHospital: cfg.municipioIbge,
    numeroAih: c.numeroAih ?? '',
    especialidade: c.especialidadeAih ?? '03',
    dataEmissao: aaaammdd(c.dataAtendimento),
    dataInternacao: aaaammdd(c.dataAtendimento),
    dataSaida: aaaammdd(c.dataFim ?? c.dataAtendimento),
    procedimentoSolicitado: c.procedimentoPrincipal ?? '',
    procedimentoRealizado: c.procedimentoPrincipal ?? '',
    caraterInternacao: c.caraterAtendimento === '2' ? '02' : '01',
    motivoSaida: c.motivoEncerramento ?? '',
    cnsMedicoSolicitante: c.cnsProfissional ?? '',
    cnsMedicoResponsavel: c.cnsProfissional ?? '',
    cidPrincipal: c.cid ?? '',
    nomePaciente: c.paciente.nome,
    dataNascimento: c.paciente.nascimento ? aaaammdd(c.paciente.nascimento) : '',
    sexo: sexoSus(c.paciente.sexo) ?? 'I',
    racaCor: c.racaCor ?? '99',
    nomeMae: c.paciente.mae,
    cnsPaciente: c.cnsPaciente ?? c.paciente.cns,
    cpfPaciente: c.paciente.cpf,
    logradouro: c.paciente.endereco,
    municipioPaciente: c.municipioIbgePaciente ?? '',
    ufPaciente: cfg.uf,
    cep: c.cepPaciente,
    prontuario: c.paciente.id.replace(/-/g, '').slice(0, 15).toUpperCase(),
    telefone: c.paciente.telefone,
    procedimentos: c.itens
      .filter(i => i.tabela === 'SIGTAP' && i.codigo !== c.procedimentoPrincipal)
      .map(i => ({ documentoProfissional: '0', cbo: i.cbo, procedimento: i.codigo, quantidade: Math.max(1, Math.round(n(i.quantidade))), competencia })),
  }
}

