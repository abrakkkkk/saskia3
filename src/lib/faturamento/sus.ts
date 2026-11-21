// Arquivos de produção do SUS em layout fixo (texto ASCII, linhas terminadas em CR+LF).
// - BPA magnético (SIA): "Layout_Exportacao_BPA.pdf" do DATASUS (ftp://arpoador.datasus.gov.br/siasus/BPA/), campos até a competência 07/2026.
// - AIH (SIH): "layout_sisaih01_2026_07.pdf" (ftp://ftp2.datasus.gov.br/pub/sistemas/dsweb/SIHD/Manuais/Layout_do_SISAIH01_para_CMPT_202607.zip),
//   registro 01 (AIH principal) com 1800 posições.
// Puro: sem banco e sem imports, para rodar também nos testes.

export class ErroSus extends Error {}

const CRLF = '\r\n'
/** Maiúsculas, sem acento e só o que o layout aceita. */
export function textoSus(valor: string | null | undefined, extras = '') {
  const permitido = new RegExp(`[^A-Z0-9 ${extras.replace(/[\\\]-]/g, '\\$&')}]`, 'g')
  return (valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(permitido, ' ').replace(/\s+/g, ' ').trim()
}
const dig = (v: string | number | null | undefined) => String(v ?? '').replace(/\D/g, '')
/** Numérico com zeros à esquerda; vazio vira zeros. Estoura com erro em vez de cortar. */
function num(v: string | number | null | undefined, tam: number, campo: string) {
  const d = dig(v)
  if (d.length > tam) throw new ErroSus(`${campo}: "${d}" passa de ${tam} dígitos.`)
  return d.padStart(tam, '0')
}
/** Numérico opcional: vazio vira brancos (o layout pede "Brancos" como padrão). */
function numOuBranco(v: string | number | null | undefined, tam: number, campo: string) {
  return dig(v) ? num(v, tam, campo) : ' '.repeat(tam)
}
const alfa = (v: string | null | undefined, tam: number, extras = '') => textoSus(v, extras).slice(0, tam).padEnd(tam, ' ')

function conferirTamanho(linha: string, esperado: number, nome: string) {
  if (linha.length !== esperado) throw new ErroSus(`Linha ${nome} com ${linha.length} posições (esperado ${esperado}).`)
  return linha
}

// ---------------------------------------------------------------- BPA

export type CabecalhoBpa = {
  competencia: string
  orgaoOrigemNome: string
  orgaoOrigemSigla: string
  /** CNPJ (ou CPF) do prestador responsável pela informação. */
  cnpjCpf: string
  orgaoDestinoNome: string
  orgaoDestinoTipo: 'M' | 'E'
  versao?: string
}
export type LinhaBpaC = { cnes: string; competencia: string; cbo: string; procedimento: string; idade: number; quantidade: number }
export type LinhaBpaI = {
  cnes: string
  competencia: string
  cnsProfissional: string
  cbo: string
  /** AAAAMMDD */
  dataAtendimento: string
  procedimento: string
  cnsPaciente?: string | null
  cpfPaciente?: string | null
  sexo: 'M' | 'F'
  municipioIbge?: string | null
  cid?: string | null
  idade: number
  quantidade: number
  /** Caráter de atendimento SIA (01 eletivo, 02 urgência...). */
  caraterAtendimento?: string | null
  numeroAutorizacao?: string | null
  nomePaciente: string
  /** AAAAMMDD */
  dataNascimento: string
  racaCor: string
  etnia?: string | null
  /** Tabela de nacionalidade do SIA: 010 = brasileiro. */
  nacionalidade?: string | null
  cep?: string | null
  endereco?: string | null
  complemento?: string | null
  numeroEndereco?: string | null
  bairro?: string | null
  telefone?: string | null
  email?: string | null
  situacaoRua?: 'S' | 'N' | null
}

const LINHAS_POR_FOLHA = 20

function linhaBpaC(l: LinhaBpaC, folha: number, seq: number) {
  if (l.quantidade < 1) throw new ErroSus(`BPA-C ${l.procedimento}: quantidade deve ser maior que zero.`)
  return conferirTamanho([
    '02',
    num(l.cnes, 7, 'CNES'),
    num(l.competencia, 6, 'Competência'),
    alfa(l.cbo, 6),
    num(folha, 3, 'Folha'),
    num(seq, 2, 'Sequência'),
    num(l.procedimento, 10, 'Procedimento'),
    num(Math.min(Math.max(l.idade, 0), 130), 3, 'Idade'),
    num(l.quantidade, 6, 'Quantidade'),
    'BPA',
  ].join(''), 48, 'BPA-C')
}

function linhaBpaI(l: LinhaBpaI, folha: number, seq: number) {
  // Regra do layout: o paciente é identificado por um só documento, CPF ou CNS.
  const cns = dig(l.cnsPaciente)
  const cpf = cns ? '' : dig(l.cpfPaciente)
  if (!cns && !cpf) throw new ErroSus(`BPA-I de ${l.nomePaciente}: informe o CNS ou o CPF do paciente.`)
  if (!/^\d{15}$/.test(dig(l.cnsProfissional))) throw new ErroSus(`BPA-I de ${l.nomePaciente}: CNS do profissional deve ter 15 dígitos.`)
  const indigena = l.racaCor === '05'
  return conferirTamanho([
    '03',
    num(l.cnes, 7, 'CNES'),
    num(l.competencia, 6, 'Competência'),
    num(l.cnsProfissional, 15, 'CNS do profissional'),
    alfa(l.cbo, 6),
    num(l.dataAtendimento, 8, 'Data de atendimento'),
    num(folha, 3, 'Folha'),
    num(seq, 2, 'Sequência'),
    num(l.procedimento, 10, 'Procedimento'),
    cns ? num(cns, 15, 'CNS do paciente') : ' '.repeat(15),
    l.sexo,
    numOuBranco(l.municipioIbge, 6, 'Município'),
    alfa((l.cid ?? '').replace(/\W/g, ''), 4),
    num(Math.min(Math.max(l.idade, 0), 130), 3, 'Idade'),
    num(l.quantidade, 6, 'Quantidade'),
    numOuBranco(l.caraterAtendimento, 2, 'Caráter'),
    numOuBranco(l.numeroAutorizacao, 13, 'Autorização'),
    'BPA',
    alfa(l.nomePaciente, 30),
    num(l.dataNascimento, 8, 'Nascimento'),
    num(l.racaCor, 2, 'Raça/cor'),
    indigena ? numOuBranco(l.etnia, 4, 'Etnia') : ' '.repeat(4),
    num(l.nacionalidade || '010', 3, 'Nacionalidade'),
    ' '.repeat(3), // serviço
    ' '.repeat(3), // classificação
    ' '.repeat(8), // sequência da equipe
    ' '.repeat(4), // área da equipe
    ' '.repeat(14), // CNPJ da empresa de OPM
    numOuBranco(l.cep, 8, 'CEP'),
    ' '.repeat(3), // código do logradouro
    alfa(l.endereco, 30),
    alfa(l.complemento, 10),
    alfa(l.numeroEndereco || 'SN', 5),
    alfa(l.bairro, 30),
    dig(l.telefone) ? dig(l.telefone).slice(-11).padEnd(11, ' ') : ' '.repeat(11),
    (l.email ?? '').toUpperCase().replace(/[^A-Z0-9@._-]/g, '').slice(0, 40).padEnd(40, ' '),
    ' '.repeat(10), // INE
    cpf ? num(cpf, 11, 'CPF do paciente') : ' '.repeat(11),
    l.situacaoRua ?? ' ',
    ' ', // pessoa sem CPF/registro civil (a partir de 07/2026)
  ].join(''), 351, 'BPA-I')
}

/** Campo de controle do cabeçalho: (soma dos códigos de procedimento + quantidades) mod 1111 + 1111. */
export function controleBpa(linhas: { procedimento: string; quantidade: number }[]) {
  const soma = linhas.reduce((s, l) => s + BigInt(dig(l.procedimento) || '0') + BigInt(l.quantidade), BigInt(0))
  return Number(soma % BigInt(1111)) + 1111
}

export function gerarBpa(cab: CabecalhoBpa, consolidado: LinhaBpaC[], individualizado: LinhaBpaI[]): string {
  if (!/^\d{6}$/.test(cab.competencia)) throw new ErroSus('Competência do BPA inválida.')
  if (!consolidado.length && !individualizado.length) throw new ErroSus('Nenhuma produção para a competência.')
  if (!textoSus(cab.orgaoDestinoNome)) throw new ErroSus('Informe o órgão de destino do BPA (configuração do faturamento).')
  const corpo: string[] = []
  let folha = 0
  consolidado.forEach((l, i) => {
    if (i % LINHAS_POR_FOLHA === 0) folha++
    corpo.push(linhaBpaC(l, folha, (i % LINHAS_POR_FOLHA) + 1))
  })
  individualizado.forEach((l, i) => {
    if (i % LINHAS_POR_FOLHA === 0) folha++
    corpo.push(linhaBpaI(l, folha, (i % LINHAS_POR_FOLHA) + 1))
  })
  const todas = [...consolidado, ...individualizado]
  const cabecalho = conferirTamanho([
    '01',
    '#BPA#',
    num(cab.competencia, 6, 'Competência'),
    num(corpo.length, 6, 'Linhas'),
    num(folha, 6, 'Folhas'),
    num(controleBpa(todas), 4, 'Controle'),
    alfa(cab.orgaoOrigemNome, 30),
    alfa(cab.orgaoOrigemSigla, 6),
    num(cab.cnpjCpf, 14, 'CNPJ/CPF'),
    alfa(cab.orgaoDestinoNome, 40),
    cab.orgaoDestinoTipo,
    alfa(cab.versao ?? 'SASKIA', 10, '.'),
  ].join(''), 130, 'cabeçalho do BPA')
  return [cabecalho, ...corpo].join(CRLF) + CRLF
}

// ---------------------------------------------------------------- AIH (SISAIH01, registro 01)

export type ProcedimentoAih = {
  /** 0 não se aplica, 1 CPF, 2 CNS */
  documentoProfissional?: string | null
  cbo?: string | null
  procedimento: string
  quantidade: number
  /** AAAAMM (diárias de UTI/acompanhante). */
  competencia?: string | null
}
export type Aih = {
  competenciaApresentacao: string
  orgaoEmissor: string
  cnes: string
  municipioHospital: string
  numeroAih: string
  especialidade: string
  /** AAAAMMDD */
  dataEmissao: string
  dataInternacao: string
  dataSaida: string
  procedimentoSolicitado: string
  procedimentoRealizado: string
  /** SIH: 01 eletivo, 02 urgência... */
  caraterInternacao: string
  motivoSaida: string
  cnsMedicoSolicitante: string
  cnsMedicoResponsavel: string
  cnsDiretorClinico?: string | null
  cnsAutorizador?: string | null
  cidPrincipal: string
  cidsSecundarios?: string[]
  cpfPaciente?: string | null
  nomePaciente: string
  /** AAAAMMDD */
  dataNascimento: string
  sexo: 'M' | 'F' | 'I'
  racaCor: string
  etnia?: string | null
  nomeMae?: string | null
  nomeResponsavel?: string | null
  cnsPaciente?: string | null
  nacionalidade?: string | null
  logradouro?: string | null
  numeroEndereco?: string | null
  complemento?: string | null
  bairro?: string | null
  municipioPaciente: string
  ufPaciente: string
  cep?: string | null
  prontuario: string
  telefone?: string | null
  situacaoRua?: 'S' | 'N' | '0' | null
  procedimentos?: ProcedimentoAih[]
}

const POS_SISAIH = 1800

function blocoProcedimento(p: ProcedimentoAih | undefined) {
  if (!p) return [
    '0', ' '.repeat(15), ' '.repeat(6), '0', '0', ' '.repeat(14), '0', ' '.repeat(15), '0'.repeat(10), '000', '0'.repeat(6), '000', '000',
  ].join('')
  return [
    num(p.documentoProfissional || '0', 1, 'Indicador do profissional'),
    ' '.repeat(15),
    alfa(p.cbo, 6),
    '0', // indicador da equipe
    '0', // indicador do prestador
    ' '.repeat(14),
    '0', // indicador do executor
    ' '.repeat(15),
    num(p.procedimento, 10, 'Procedimento da AIH'),
    num(p.quantidade, 3, 'Quantidade da AIH'),
    p.competencia ? num(p.competencia, 6, 'Competência do procedimento') : '0'.repeat(6),
    '000', // serviço
    '000', // classificação
  ].join('')
}

export function linhaAih(a: Aih): string {
  const cns = dig(a.cnsPaciente)
  if (!cns && !dig(a.cpfPaciente)) throw new ErroSus(`AIH ${a.numeroAih}: informe o CNS ou o CPF do paciente.`)
  if (!/^\d{13}$/.test(dig(a.numeroAih))) throw new ErroSus(`AIH de ${a.nomePaciente}: o número da AIH tem 13 dígitos.`)
  for (const [campo, valor] of [['médico solicitante', a.cnsMedicoSolicitante], ['médico responsável', a.cnsMedicoResponsavel]] as const) {
    if (!/^\d{15}$/.test(dig(valor))) throw new ErroSus(`AIH ${a.numeroAih}: CNS do ${campo} deve ter 15 dígitos.`)
  }
  const procs = (a.procedimentos ?? []).slice(0, 9)
  const diag = (a.cidsSecundarios ?? []).slice(0, 9)
  const docMed = (v: string | null | undefined) => dig(v) ? `2${num(v, 15, 'CNS')}` : `0${' '.repeat(15)}`
  const extras = '/()\\-,.'
  const linha = [
    '0'.repeat(8), // NU_LOTE
    '000', // QT_LOTE
    num(a.competenciaApresentacao, 6, 'Apresentação'),
    '000', // SEQ_LOTE
    alfa(a.orgaoEmissor, 10),
    num(a.cnes, 7, 'CNES'),
    num(a.municipioHospital, 6, 'Município do hospital'),
    num(a.numeroAih, 13, 'Número da AIH'),
    '01', // AIH principal
    num(a.especialidade, 2, 'Especialidade'),
    '0'.repeat(45),
    '02', // modalidade hospitalar
    '000',
    '0'.repeat(13),
    '0'.repeat(13),
    num(a.dataEmissao, 8, 'Emissão'),
    num(a.dataInternacao, 8, 'Internação'),
    num(a.dataSaida, 8, 'Saída'),
    num(a.procedimentoSolicitado, 10, 'Procedimento solicitado'),
    a.procedimentoSolicitado === a.procedimentoRealizado ? '2' : '1',
    num(a.procedimentoRealizado, 10, 'Procedimento realizado'),
    num(a.caraterInternacao, 2, 'Caráter'),
    num(a.motivoSaida, 2, 'Motivo de saída'),
    docMed(a.cnsMedicoSolicitante),
    docMed(a.cnsMedicoResponsavel),
    docMed(a.cnsDiretorClinico),
    docMed(a.cnsAutorizador),
    alfa(a.cidPrincipal.replace(/\W/g, ''), 4),
    '0000',
    num(cns ? '' : a.cpfPaciente, 11, 'CPF do paciente'),
    alfa(a.nomePaciente, 70, extras),
    num(a.dataNascimento, 8, 'Nascimento'),
    a.sexo,
    num(a.racaCor, 2, 'Raça/cor'),
    alfa(a.nomeMae || 'IGNORADA', 70, extras),
    alfa(a.nomeResponsavel || a.nomePaciente, 70, extras),
    '5', // tipo de documento: ignorado (identificação por CNS/CPF)
    a.racaCor === '05' ? num(a.etnia, 4, 'Etnia') : '0000',
    '00000',
    'N',
    a.situacaoRua ?? '0',
    cns ? num(cns, 15, 'CNS do paciente') : ' '.repeat(15),
    num(a.nacionalidade || '010', 3, 'Nacionalidade'),
    '081', // tipo de logradouro: rua (tabela DNE)
    alfa(a.logradouro || 'NAO INFORMADO', 50, extras),
    alfa(a.numeroEndereco || 'SN', 7),
    alfa(a.complemento, 15, extras),
    alfa(a.bairro || 'NAO INFORMADO', 30, extras),
    num(a.municipioPaciente, 6, 'Município do paciente'),
    alfa(a.ufPaciente, 2),
    num(a.cep, 8, 'CEP'),
    alfa(a.prontuario, 15),
    '0000', // enfermaria
    '0000', // leito
    ...Array.from({ length: 9 }, (_, i) => blocoProcedimento(procs[i])),
    '0'.repeat(7),
    '00', // fonte orçamentária
    '0'.repeat(10), // INE
    '0', // saída UTI neonatal
    '0000',
    '0',
    '0'.repeat(14),
    '0'.repeat(6),
    '000',
    '0',
    '0', '0', // nascidos vivos/mortos
    ['11', '12', '14', '15', '16', '18', '19'].includes(a.motivoSaida) ? '1' : '0',
    a.motivoSaida.startsWith('3') ? '1' : '0',
    a.motivoSaida.startsWith('4') ? '1' : '0',
    '0'.repeat(10),
    '00',
    '0',
    '    ', // CID de indicação (laqueadura)
    '00', '00',
    '0',
    ' '.repeat(35),
    '0'.repeat(12),
    ' '.repeat(32),
    dig(a.telefone).length >= 10 ? dig(a.telefone).slice(0, 2) : '  ',
    dig(a.telefone).length >= 10 ? dig(a.telefone).slice(2).slice(-9).padStart(9, '0') : ' '.repeat(9),
    ' '.repeat(50),
    ...Array.from({ length: 9 }, (_, i) => diag[i] ? `${alfa(diag[i].replace(/\W/g, ''), 4)}0` : '    0'),
    '0'.repeat(165),
  ].join('')
  return conferirTamanho(linha, POS_SISAIH, `AIH ${a.numeroAih}`)
}

export function gerarArquivoAih(aihs: Aih[]): string {
  if (!aihs.length) throw new ErroSus('Nenhuma AIH para a competência.')
  return aihs.map(linhaAih).join(CRLF) + CRLF
}

/** Idade em anos completos na data de referência (AAAAMMDD). */
export function idadeEm(nascimento: Date, referencia: Date) {
  let anos = referencia.getUTCFullYear() - nascimento.getUTCFullYear()
  const m = referencia.getUTCMonth() - nascimento.getUTCMonth()
  if (m < 0 || (m === 0 && referencia.getUTCDate() < nascimento.getUTCDate())) anos--
  return Math.max(anos, 0)
}
export const aaaammdd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
