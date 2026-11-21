// Gerador do lote de guias TISS (ANS), versão 4.03.00 do componente de comunicação (vigente desde 01/12/2025).
// Estrutura conferida com tissV4_03_00.xsd / tissGuiasV4_03_00.xsd / tissComplexTypesV4_03_00.xsd (PadroTISSComunicao_202511.zip).
// Puro: sem banco e sem imports de projeto, para rodar também no teste de validação contra o XSD oficial.
import { createHash } from 'node:crypto'

export const VERSAO_TISS = '4.03.00'
const NS = 'http://www.ans.gov.br/padroes/tiss/schemas'

export type PrestadorTiss = { cnpj: string; codigoNaOperadora?: string | null; cnes: string }
export type ProfissionalTiss = { nome: string; conselho: string; numeroConselho: string; ufIbge: string; cbo: string; cpf?: string | null }
export type ItemTiss = {
  tabela: string
  codigo: string
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  /** AAAA-MM-DD */
  dataExecucao: string
  /** Tabela 25; vazio = procedimento. */
  codigoDespesa?: string | null
  unidadeMedida?: string | null
}
export type GuiaTiss = {
  tipo: 'CONSULTA' | 'SP_SADT' | 'RESUMO_INTERNACAO'
  numeroGuiaPrestador: string
  numeroGuiaOperadora?: string | null
  senha?: string | null
  /** AAAA-MM-DD */
  dataAutorizacao?: string | null
  numeroCarteira: string
  atendimentoRN?: boolean
  /** AAAA-MM-DD */
  dataAtendimento: string
  /** AAAA-MM-DD; fim do faturamento da internação. */
  dataFim?: string | null
  horaInicio?: string | null
  horaFim?: string | null
  caraterAtendimento: string
  indicacaoAcidente: string
  tipoAtendimento?: string | null
  tipoConsulta?: string | null
  regimeAtendimento: string
  motivoEncerramento?: string | null
  tipoInternacao?: string | null
  regimeInternacao?: string | null
  cids?: string[]
  indicacaoClinica?: string | null
  profissional: ProfissionalTiss
  observacao?: string | null
  itens: ItemTiss[]
}
export type LoteTiss = {
  numeroLote: string
  sequencialTransacao: string
  dataHora: Date
  prestador: PrestadorTiss
  registroAns: string
  guias: GuiaTiss[]
}

export class ErroTiss extends Error {}

/** Texto aceito pelo arquivo ISO-8859-1: troca o que não existe no Latin-1 e tira controles. */
export function textoLatin1(valor: string) {
  return valor
    .normalize('NFC')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dinheiro = (n: number) => (Math.round(n * 100) / 100).toFixed(2)
const soDigitos = (t: string | null | undefined) => (t ?? '').replace(/\D/g, '')
const corta = (t: string, max: number) => textoLatin1(t).slice(0, max)

/** Fuso de Brasília para data e hora do cabeçalho. */
function dataHoraBrasilia(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map(x => [x.type, x.value]))
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` }
}

// Montagem: árvore simples [nome, filhos | texto]. Campo opcional vazio some da árvore.
type No = [string, No[] | string] | null
const el = (nome: string, conteudo: No[] | string | null | undefined): No => {
  if (conteudo === null || conteudo === undefined) return null
  if (typeof conteudo === 'string') return conteudo === '' ? null : [nome, conteudo]
  const filhos = conteudo.filter(Boolean)
  return filhos.length ? [nome, filhos] : null
}
function serializar(no: No, nivel: number, textos: string[]): string {
  if (!no) return ''
  const [nome, conteudo] = no
  const pad = '  '.repeat(nivel)
  if (typeof conteudo === 'string') {
    textos.push(conteudo)
    return `${pad}<ans:${nome}>${esc(conteudo)}</ans:${nome}>\n`
  }
  return `${pad}<ans:${nome}>\n${conteudo.map(f => serializar(f, nivel + 1, textos)).join('')}${pad}</ans:${nome}>\n`
}

function contratado(p: PrestadorTiss): No[] {
  const codigo = p.codigoNaOperadora?.trim()
  return codigo ? [el('codigoPrestadorNaOperadora', corta(codigo, 14))] : [el('cnpjContratado', soDigitos(p.cnpj))]
}
function beneficiario(g: GuiaTiss): No {
  return el('dadosBeneficiario', [el('numeroCarteira', corta(g.numeroCarteira, 20)), el('atendimentoRN', g.atendimentoRN ? 'S' : 'N')])
}
function profissional(nome: string, p: ProfissionalTiss): No {
  return el(nome, [
    el('nomeProfissional', p.nome ? corta(p.nome, 70) : null),
    el('conselhoProfissional', p.conselho),
    el('numeroConselhoProfissional', corta(p.numeroConselho, 15)),
    el('UF', p.ufIbge),
    el('CBOS', p.cbo),
  ])
}
function procedimentoDados(i: ItemTiss): No {
  return el('procedimento', [el('codigoTabela', i.tabela), el('codigoProcedimento', corta(i.codigo, 10)), el('descricaoProcedimento', corta(i.descricao, 150))])
}
function procedimentoExecutado(i: ItemTiss, seq: number): No {
  return el('procedimentoExecutado', [
    el('sequencialItem', String(seq)),
    el('dataExecucao', i.dataExecucao),
    procedimentoDados(i),
    el('quantidadeExecutada', String(Math.round(i.quantidade))),
    el('reducaoAcrescimo', '1.00'),
    el('valorUnitario', dinheiro(i.valorUnitario)),
    el('valorTotal', dinheiro(i.valorTotal)),
  ])
}
function despesa(i: ItemTiss, seq: number): No {
  return el('despesa', [
    el('sequencialItem', String(seq)),
    el('codigoDespesa', i.codigoDespesa ?? ''),
    el('servicosExecutados', [
      el('dataExecucao', i.dataExecucao),
      el('codigoTabela', i.tabela),
      el('codigoProcedimento', corta(i.codigo, 10)),
      el('quantidadeExecutada', i.quantidade.toFixed(4)),
      el('unidadeMedida', i.unidadeMedida || '036'),
      el('reducaoAcrescimo', '1.00'),
      el('valorUnitario', dinheiro(i.valorUnitario)),
      el('valorTotal', dinheiro(i.valorTotal)),
      el('descricaoProcedimento', corta(i.descricao, 150)),
    ]),
  ])
}

/** Totais por natureza, exigidos em ct_guiaValorTotal. */
export function totaisGuia(itens: ItemTiss[]) {
  const soma = (f: (i: ItemTiss) => boolean) => itens.filter(f).reduce((s, i) => s + i.valorTotal, 0)
  return {
    valorProcedimentos: soma(i => !i.codigoDespesa),
    valorDiarias: soma(i => i.codigoDespesa === '05'),
    valorTaxasAlugueis: soma(i => i.codigoDespesa === '07'),
    valorMateriais: soma(i => i.codigoDespesa === '03'),
    valorMedicamentos: soma(i => i.codigoDespesa === '02'),
    valorOPME: soma(i => i.codigoDespesa === '08'),
    valorGasesMedicinais: soma(i => i.codigoDespesa === '01'),
    valorTotalGeral: itens.reduce((s, i) => s + i.valorTotal, 0),
  }
}
function valorTotal(itens: ItemTiss[]): No {
  const t = totaisGuia(itens)
  return el('valorTotal', (Object.entries(t) as [string, number][])
    .filter(([k, v]) => k === 'valorTotalGeral' || v > 0)
    .map(([k, v]) => el(k, dinheiro(v))))
}
function outrasDespesas(itens: ItemTiss[]): No {
  const desp = itens.filter(i => i.codigoDespesa)
  return desp.length ? el('outrasDespesas', desp.map((i, n) => despesa(i, n + 1))) : null
}

function guiaConsulta(g: GuiaTiss, l: LoteTiss): No {
  const proc = g.itens.find(i => !i.codigoDespesa)
  if (!proc) throw new ErroTiss(`Guia ${g.numeroGuiaPrestador}: a consulta precisa de um procedimento.`)
  return el('guiaConsulta', [
    el('cabecalhoConsulta', [el('registroANS', l.registroAns), el('numeroGuiaPrestador', corta(g.numeroGuiaPrestador, 20))]),
    el('numeroGuiaOperadora', g.numeroGuiaOperadora ? corta(g.numeroGuiaOperadora, 20) : null),
    beneficiario(g),
    el('contratadoExecutante', [...contratado(l.prestador), el('CNES', corta(l.prestador.cnes, 7))]),
    profissional('profissionalExecutante', g.profissional),
    el('indicacaoAcidente', g.indicacaoAcidente),
    el('dadosAtendimento', [
      el('regimeAtendimento', g.regimeAtendimento),
      el('dataAtendimento', g.dataAtendimento),
      el('tipoConsulta', g.tipoConsulta || '1'),
      el('procedimento', [el('codigoTabela', proc.tabela), el('codigoProcedimento', corta(proc.codigo, 10)), el('valorProcedimento', dinheiro(proc.valorTotal))]),
    ]),
    el('observacao', g.observacao ? corta(g.observacao, 500) : null),
  ])
}

function guiaSadt(g: GuiaTiss, l: LoteTiss): No {
  const procs = g.itens.filter(i => !i.codigoDespesa)
  return el('guiaSP-SADT', [
    el('cabecalhoGuia', [el('registroANS', l.registroAns), el('numeroGuiaPrestador', corta(g.numeroGuiaPrestador, 20))]),
    g.dataAutorizacao ? el('dadosAutorizacao', [
      el('numeroGuiaOperadora', g.numeroGuiaOperadora ? corta(g.numeroGuiaOperadora, 20) : null),
      el('dataAutorizacao', g.dataAutorizacao),
      el('senha', g.senha ? corta(g.senha, 20) : null),
    ]) : null,
    beneficiario(g),
    el('dadosSolicitante', [
      el('contratadoSolicitante', contratado(l.prestador)),
      el('nomeContratadoSolicitante', corta(g.profissional.nome || 'PRESTADOR', 70)),
      profissional('profissionalSolicitante', g.profissional),
    ]),
    el('dadosSolicitacao', [
      el('dataSolicitacao', g.dataAtendimento),
      el('caraterAtendimento', g.caraterAtendimento),
      el('indicacaoClinica', g.indicacaoClinica ? corta(g.indicacaoClinica, 500) : null),
    ]),
    el('dadosExecutante', [el('contratadoExecutante', contratado(l.prestador)), el('CNES', corta(l.prestador.cnes, 7))]),
    el('dadosAtendimento', [
      el('tipoAtendimento', g.tipoAtendimento || '23'),
      el('indicacaoAcidente', g.indicacaoAcidente),
      el('tipoConsulta', g.tipoAtendimento === '04' ? (g.tipoConsulta || '1') : null),
      el('regimeAtendimento', g.regimeAtendimento),
    ]),
    procs.length ? el('procedimentosExecutados', procs.map((i, n) => procedimentoExecutado(i, n + 1))) : null,
    outrasDespesas(g.itens),
    el('observacao', g.observacao ? corta(g.observacao, 500) : null),
    valorTotal(g.itens),
  ])
}

function guiaResumoInternacao(g: GuiaTiss, l: LoteTiss): No {
  if (!g.senha || !g.dataAutorizacao) throw new ErroTiss(`Guia ${g.numeroGuiaPrestador}: o resumo de internação exige senha e data de autorização.`)
  if (!g.dataFim || !g.motivoEncerramento) throw new ErroTiss(`Guia ${g.numeroGuiaPrestador}: informe a data de saída e o motivo de encerramento.`)
  const procs = g.itens.filter(i => !i.codigoDespesa)
  return el('guiaResumoInternacao', [
    el('cabecalhoGuia', [el('registroANS', l.registroAns), el('numeroGuiaPrestador', corta(g.numeroGuiaPrestador, 20))]),
    el('numeroGuiaSolicitacaoInternacao', corta(g.numeroGuiaOperadora || g.numeroGuiaPrestador, 20)),
    el('dadosAutorizacao', [
      el('numeroGuiaOperadora', g.numeroGuiaOperadora ? corta(g.numeroGuiaOperadora, 20) : null),
      el('dataAutorizacao', g.dataAutorizacao),
      el('senha', corta(g.senha, 20)),
    ]),
    beneficiario(g),
    el('dadosExecutante', [el('contratadoExecutante', contratado(l.prestador)), el('CNES', corta(l.prestador.cnes, 7))]),
    el('dadosInternacao', [
      el('caraterAtendimento', g.caraterAtendimento),
      el('tipoFaturamento', '4'),
      el('dataInicioFaturamento', g.dataAtendimento),
      el('horaInicioFaturamento', g.horaInicio || '00:00:00'),
      el('dataFinalFaturamento', g.dataFim),
      el('horaFinalFaturamento', g.horaFim || '23:59:59'),
      el('tipoInternacao', g.tipoInternacao || '1'),
      el('regimeInternacao', g.regimeInternacao || '1'),
    ]),
    el('dadosSaidaInternacao', [
      ...(g.cids ?? []).filter(Boolean).slice(0, 4).map(c => el('diagnostico', c.replace(/\W/g, '').toUpperCase().slice(0, 4))),
      el('indicadorAcidente', g.indicacaoAcidente),
      el('motivoEncerramento', g.motivoEncerramento),
    ]),
    procs.length ? el('procedimentosExecutados', procs.map((i, n) => procedimentoExecutado(i, n + 1))) : null,
    valorTotal(g.itens),
    outrasDespesas(g.itens),
    el('observacao', g.observacao ? corta(g.observacao, 500) : null),
  ])
}

/**
 * Gera a mensagem ENVIO_LOTE_GUIAS. Um lote tem um só tipo de guia (choice do XSD) e no máximo 100 guias.
 * Hash do epílogo: MD5 da concatenação do conteúdo de todos os elementos da mensagem (sem as tags), em ISO-8859-1.
 */
export function gerarLoteTiss(l: LoteTiss): { xml: string; hash: string } {
  if (!l.guias.length) throw new ErroTiss('Lote sem guias.')
  if (l.guias.length > 100) throw new ErroTiss('O padrão TISS aceita no máximo 100 guias por lote.')
  const tipos = new Set(l.guias.map(g => g.tipo))
  if (tipos.size > 1) throw new ErroTiss('Um lote TISS só pode ter um tipo de guia.')
  if (!/^\d{6}$/.test(l.registroAns)) throw new ErroTiss('Registro ANS da operadora deve ter 6 dígitos.')
  if (!/^\d{7}$/.test(l.prestador.cnes)) throw new ErroTiss('CNES do hospital deve ter 7 dígitos.')
  if (!l.prestador.codigoNaOperadora && !/^\d{14}$/.test(soDigitos(l.prestador.cnpj))) throw new ErroTiss('CNPJ do hospital inválido.')

  const { data, hora } = dataHoraBrasilia(l.dataHora)
  const origem = l.prestador.codigoNaOperadora?.trim()
    ? el('codigoPrestadorNaOperadora', corta(l.prestador.codigoNaOperadora, 14))
    : el('CNPJ', soDigitos(l.prestador.cnpj))
  const cabecalho = el('cabecalho', [
    el('identificacaoTransacao', [
      el('tipoTransacao', 'ENVIO_LOTE_GUIAS'),
      el('sequencialTransacao', corta(l.sequencialTransacao, 12)),
      el('dataRegistroTransacao', data),
      el('horaRegistroTransacao', hora),
    ]),
    el('origem', [el('identificacaoPrestador', [origem])]),
    el('destino', [el('registroANS', l.registroAns)]),
    el('Padrao', VERSAO_TISS),
  ])
  const montar = (g: GuiaTiss) => g.tipo === 'CONSULTA' ? guiaConsulta(g, l) : g.tipo === 'SP_SADT' ? guiaSadt(g, l) : guiaResumoInternacao(g, l)
  const corpo = el('prestadorParaOperadora', [
    el('loteGuias', [el('numeroLote', corta(l.numeroLote, 12)), el('guiasTISS', l.guias.map(montar))]),
  ])

  const textos: string[] = []
  const conteudo = serializar(cabecalho, 1, textos) + serializar(corpo, 1, textos)
  const hash = createHash('md5').update(Buffer.from(textos.join(''), 'latin1')).digest('hex')
  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>\n<ans:mensagemTISS xmlns:ans="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n${conteudo}  <ans:epilogo>\n    <ans:hash>${hash}</ans:hash>\n  </ans:epilogo>\n</ans:mensagemTISS>\n`
  return { xml, hash }
}
