// Internação (item 9): entrada, troca de leito e saída numa transação só.
// Paciente.status acompanha a internação aberta; nenhuma outra rota muda os status de internação.
import type { Prisma, TipoSaidaInternacao } from '@prisma/client'
import type { Ator } from '@/lib/api-guard'
import { isTerminal, transicaoValida, type StatusPaciente } from '@/lib/paciente-status'
import { registrarEvento } from '@/lib/pacientes'

export const SETOR_UTI = 'UTI'
export const SETORES_SUGERIDOS = ['Enfermaria', SETOR_UTI, 'Observação do pronto-socorro', 'Apartamento', 'Pediatria', 'Maternidade', 'Isolamento'] as const

export const TIPOS_SAIDA = ['ALTA_MEDICA', 'TRANSFERENCIA', 'EVASAO', 'OBITO'] as const satisfies readonly TipoSaidaInternacao[]

export const ROTULO_SAIDA: Record<TipoSaidaInternacao, string> = {
  ALTA_MEDICA: 'Alta médica',
  TRANSFERENCIA: 'Transferência',
  EVASAO: 'Evasão',
  OBITO: 'Óbito',
}

/** Status do paciente que cada saída grava. */
export const STATUS_DA_SAIDA: Record<TipoSaidaInternacao, StatusPaciente> = {
  ALTA_MEDICA: 'Alta Médica',
  TRANSFERENCIA: 'Transferido',
  EVASAO: 'Evasão',
  OBITO: 'Óbito',
}

/** Saídas que só o médico registra (mesma regra de STATUS_DESFECHO). */
export const SAIDAS_MEDICAS: readonly TipoSaidaInternacao[] = ['ALTA_MEDICA', 'TRANSFERENCIA']

export { STATUS_INTERNADO } from '@/lib/paciente-status'

export function statusDoSetor(setor: string): StatusPaciente {
  return setor === SETOR_UTI ? 'Internado - UTI' : 'Internado'
}

export function isTipoSaida(valor: unknown): valor is TipoSaidaInternacao {
  return typeof valor === 'string' && (TIPOS_SAIDA as readonly string[]).includes(valor)
}

export type Falha = { erro: string; codigo: number }
export const falha = (erro: string, codigo = 409): Falha => ({ erro, codigo })
export const ehFalha = (v: unknown): v is Falha => !!v && typeof v === 'object' && 'erro' in v && 'codigo' in v

/** Destino do paciente: setor e leito livres ou um leito de UTI cadastrado. */
export type DestinoLeito = { setor: string; leito: string | null; utiLeitoId: string | null }

export type DadosEntrada = DestinoLeito & {
  motivo: string | null
  cid: string | null
  medicoResponsavelId: string | null
  entradaEm?: Date
}

export type DadosSaida = {
  tipoSaida: TipoSaidaInternacao
  destinoTransferencia: string | null
  motivoSaida: string | null
  saidaEm?: Date
}

function texto(valor: unknown, limite: number): string | null | undefined {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string' || valor.length > limite) return undefined
  return valor.trim() || null
}

/** Data/hora informada pelo usuário: não aceita futuro (com 5 min de folga) nem mais de 1 ano atrás. */
export function lerDataHora(valor: unknown): Date | null | undefined {
  if (valor === undefined || valor === null || valor === '') return null
  if (typeof valor !== 'string') return undefined
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return undefined
  const agora = Date.now()
  if (data.getTime() > agora + 5 * 60_000 || data.getTime() < agora - 366 * 86_400_000) return undefined
  return data
}

export function validarDestino(input: Record<string, unknown>): DestinoLeito | Falha {
  const setor = texto(input.setor, 80)
  const leito = texto(input.leito, 40)
  const utiLeitoId = texto(input.utiLeitoId, 64)
  if (setor === undefined || leito === undefined || utiLeitoId === undefined) return falha('Setor ou leito inválido', 400)
  if (utiLeitoId) return { setor: SETOR_UTI, leito: null, utiLeitoId }
  if (!setor) return falha('Informe o setor da internação', 400)
  if (setor === SETOR_UTI) return falha('Para UTI, escolha um leito de UTI cadastrado', 400)
  return { setor, leito, utiLeitoId: null }
}

export function validarEntrada(input: Record<string, unknown>): DadosEntrada | Falha {
  const destino = validarDestino(input)
  if (ehFalha(destino)) return destino
  const motivo = texto(input.motivo, 2000)
  const cid = texto(input.cid, 12)
  const medicoResponsavelId = texto(input.medicoResponsavelId, 64)
  const entradaEm = lerDataHora(input.entradaEm)
  if (motivo === undefined || cid === undefined || medicoResponsavelId === undefined) return falha('Dados da internação inválidos', 400)
  if (entradaEm === undefined) return falha('Data e hora de entrada inválidas', 400)
  if (!motivo) return falha('Informe o motivo da internação', 400)
  return { ...destino, motivo, cid: cid?.toUpperCase() ?? null, medicoResponsavelId, ...(entradaEm ? { entradaEm } : {}) }
}

export function validarSaida(input: Record<string, unknown>): DadosSaida | Falha {
  if (!isTipoSaida(input.tipoSaida) || input.tipoSaida === 'OBITO') {
    return falha('Tipo de saída inválido (óbito é registrado no módulo de Óbitos)', 400)
  }
  const destinoTransferencia = texto(input.destinoTransferencia, 200)
  const motivoSaida = texto(input.motivoSaida, 2000)
  const saidaEm = lerDataHora(input.saidaEm)
  if (destinoTransferencia === undefined || motivoSaida === undefined) return falha('Dados da saída inválidos', 400)
  if (saidaEm === undefined) return falha('Data e hora de saída inválidas', 400)
  if (input.tipoSaida === 'TRANSFERENCIA' && !destinoTransferencia) return falha('Informe o destino da transferência', 400)
  return {
    tipoSaida: input.tipoSaida,
    destinoTransferencia: input.tipoSaida === 'TRANSFERENCIA' ? destinoTransferencia : null,
    motivoSaida,
    ...(saidaEm ? { saidaEm } : {}),
  }
}

/** Campos legados de leito do cadastro, mantidos para a lista de pacientes. */
function leitoLegado(destino: DestinoLeito, numeroUti: number | null) {
  const numero = numeroUti ?? (destino.leito && /^\d{1,9}$/.test(destino.leito) ? Number(destino.leito) : null)
  return { leitoTipo: destino.setor.slice(0, 40), leitoNumero: numero }
}

function descreverLeito(destino: DestinoLeito, numeroUti: number | null) {
  const leito = numeroUti !== null ? `leito ${numeroUti}` : destino.leito ? `leito ${destino.leito}` : 'leito a definir'
  return `${destino.setor}, ${leito}`
}

/** Ocupa o leito de UTI (precisa estar livre e ser do hospital). Devolve o número do leito. */
async function ocuparUti(tx: Prisma.TransactionClient, hospitalId: string, utiLeitoId: string, paciente: { id: string; nome: string; cpf: string | null }) {
  const leito = await tx.utiLeito.findFirst({ where: { id: utiLeitoId, hospitalId }, select: { id: true, numero: true, status: true, pacienteId: true } })
  if (!leito) return falha('Leito de UTI não encontrado', 404)
  if (leito.status !== 'LIVRE' || leito.pacienteId) return falha('O leito de UTI escolhido não está livre')
  const alterado = await tx.utiLeito.updateMany({
    where: { id: utiLeitoId, hospitalId, status: 'LIVRE', pacienteId: null },
    data: { status: 'OCUPADO', pacienteId: paciente.id, pacienteNome: paciente.nome, pacienteCpf: paciente.cpf },
  })
  if (alterado.count === 0) return falha('O leito foi alterado por outra pessoa. Atualize a tela.')
  return leito.numero
}

async function liberarUti(tx: Prisma.TransactionClient, hospitalId: string, utiLeitoId: string | null, pacienteId: string) {
  if (!utiLeitoId) return
  await tx.utiLeito.updateMany({
    where: { id: utiLeitoId, hospitalId, pacienteId },
    data: { status: 'LIVRE', pacienteId: null, pacienteNome: null, pacienteCpf: null },
  })
}

async function nomeDoMedico(tx: Prisma.TransactionClient, hospitalId: string, id: string | null) {
  if (!id) return null
  const medico = await tx.usuario.findFirst({ where: { id, hospitalId, cargo: 'MEDICO' }, select: { nome: true } })
  return medico ? medico.nome : undefined
}

export const SELECT_INTERNACAO = {
  id: true, entradaEm: true, setor: true, leito: true, utiLeitoId: true, motivo: true, cid: true,
  medicoResponsavelNome: true, registradoPorNome: true, saidaEm: true, tipoSaida: true,
  destinoTransferencia: true, motivoSaida: true, encerradoPorNome: true, origem: true,
  utiLeito: { select: { numero: true } },
  movimentacoes: {
    orderBy: { inicioEm: 'asc' },
    select: { id: true, setor: true, leito: true, inicioEm: true, fimEm: true, motivo: true, usuarioNome: true, utiLeito: { select: { numero: true } } },
  },
} as const satisfies Prisma.InternacaoSelect

/**
 * Interna o paciente. Exige paciente ativo do hospital, sem internação aberta e com transição de jornada válida.
 * Chamar dentro de transação Serializable.
 */
export async function internar(
  tx: Prisma.TransactionClient,
  ator: Ator,
  pacienteId: string,
  dados: DadosEntrada,
  opcoes: { origem?: string; ignorarJornada?: boolean } = {},
) {
  const { hospitalId } = ator
  const paciente = await tx.paciente.findFirst({
    where: { id: pacienteId, hospitalId, arquivadoEm: null },
    select: { id: true, nome: true, cpf: true, status: true },
  })
  if (!paciente) return falha('Paciente não encontrado neste hospital', 404)
  if (isTerminal(paciente.status)) return falha('Paciente com óbito registrado não pode ser internado')
  const aberta = await tx.internacao.findFirst({ where: { hospitalId, pacienteId, saidaEm: null }, select: { id: true } })
  if (aberta) return falha('O paciente já tem uma internação aberta. Use a troca de leito.')

  const novoStatus = statusDoSetor(dados.setor)
  if (!opcoes.ignorarJornada && !transicaoValida(paciente.status, novoStatus) && !transicaoValida(paciente.status, 'Internado')) {
    return falha(`Paciente em "${paciente.status}" não pode ser internado. Atualize a etapa do atendimento antes.`)
  }

  const medicoNome = await nomeDoMedico(tx, hospitalId, dados.medicoResponsavelId)
  if (medicoNome === undefined) return falha('Médico responsável não encontrado neste hospital', 400)

  let numeroUti: number | null = null
  if (dados.utiLeitoId) {
    const ocupado = await ocuparUti(tx, hospitalId, dados.utiLeitoId, paciente)
    if (ehFalha(ocupado)) return ocupado
    numeroUti = ocupado
  }

  const entradaEm = dados.entradaEm ?? new Date()
  const leito = numeroUti !== null ? String(numeroUti) : dados.leito
  const internacao = await tx.internacao.create({
    data: {
      hospitalId, pacienteId, entradaEm, setor: dados.setor, leito, utiLeitoId: dados.utiLeitoId,
      motivo: dados.motivo, cid: dados.cid, medicoResponsavelId: dados.medicoResponsavelId, medicoResponsavelNome: medicoNome,
      registradoPorId: ator.id, registradoPorNome: ator.nome, origem: opcoes.origem ?? 'SISTEMA',
      movimentacoes: {
        create: { hospitalId, setor: dados.setor, leito, utiLeitoId: dados.utiLeitoId, inicioEm: entradaEm, motivo: 'Entrada', usuarioId: ator.id, usuarioNome: ator.nome },
      },
    },
    select: { id: true },
  })

  await tx.paciente.updateMany({
    where: { id: pacienteId, hospitalId },
    data: { status: novoStatus, ...leitoLegado(dados, numeroUti) },
  })
  await registrarEvento(tx, ator, pacienteId, 'Internação', `Internado em ${descreverLeito(dados, numeroUti)}. Motivo: ${dados.motivo ?? 'não informado'}`)
  return { internacaoId: internacao.id, pacienteId, statusAnterior: paciente.status, status: novoStatus }
}

async function internacaoAberta(tx: Prisma.TransactionClient, hospitalId: string, internacaoId: string) {
  const internacao = await tx.internacao.findFirst({
    where: { id: internacaoId, hospitalId },
    select: { id: true, pacienteId: true, setor: true, leito: true, utiLeitoId: true, saidaEm: true, paciente: { select: { id: true, nome: true, cpf: true, status: true } } },
  })
  if (!internacao) return falha('Internação não encontrada', 404)
  if (internacao.saidaEm) return falha('Esta internação já foi encerrada')
  return internacao
}

export async function trocarLeito(tx: Prisma.TransactionClient, ator: Ator, internacaoId: string, destino: DestinoLeito, motivo: string | null) {
  const { hospitalId } = ator
  const atual = await internacaoAberta(tx, hospitalId, internacaoId)
  if (ehFalha(atual)) return atual
  const mesmoLeito = destino.utiLeitoId
    ? destino.utiLeitoId === atual.utiLeitoId
    : !atual.utiLeitoId && destino.setor === atual.setor && (destino.leito ?? '') === (atual.leito ?? '')
  if (mesmoLeito) return falha('O paciente já está neste leito', 400)

  const agora = new Date()
  await liberarUti(tx, hospitalId, atual.utiLeitoId, atual.pacienteId)
  let numeroUti: number | null = null
  if (destino.utiLeitoId) {
    const ocupado = await ocuparUti(tx, hospitalId, destino.utiLeitoId, atual.paciente)
    if (ehFalha(ocupado)) return ocupado
    numeroUti = ocupado
  }
  const leito = numeroUti !== null ? String(numeroUti) : destino.leito

  await tx.movimentacaoLeito.updateMany({ where: { internacaoId, hospitalId, fimEm: null }, data: { fimEm: agora } })
  await tx.movimentacaoLeito.create({
    data: { hospitalId, internacaoId, setor: destino.setor, leito, utiLeitoId: destino.utiLeitoId, inicioEm: agora, motivo, usuarioId: ator.id, usuarioNome: ator.nome },
  })
  const alterada = await tx.internacao.updateMany({
    where: { id: internacaoId, hospitalId, saidaEm: null },
    data: { setor: destino.setor, leito, utiLeitoId: destino.utiLeitoId },
  })
  if (alterada.count === 0) return falha('A internação foi alterada por outra pessoa. Atualize a tela.')

  const novoStatus = statusDoSetor(destino.setor)
  await tx.paciente.updateMany({ where: { id: atual.pacienteId, hospitalId }, data: { status: novoStatus, ...leitoLegado(destino, numeroUti) } })
  const de = `${atual.setor}${atual.leito ? `, leito ${atual.leito}` : ''}`
  await registrarEvento(tx, ator, atual.pacienteId, 'Troca de leito', `${de} para ${descreverLeito(destino, numeroUti)}${motivo ? `. Motivo: ${motivo}` : ''}`)
  return { internacaoId, pacienteId: atual.pacienteId, status: novoStatus }
}

/** Encerra a internação. Óbito chega aqui pelo módulo de Óbitos, que já grava o status do paciente. */
export async function encerrar(tx: Prisma.TransactionClient, ator: Ator, internacaoId: string, dados: DadosSaida) {
  const { hospitalId } = ator
  const atual = await internacaoAberta(tx, hospitalId, internacaoId)
  if (ehFalha(atual)) return atual
  const saidaEm = dados.saidaEm ?? new Date()

  await liberarUti(tx, hospitalId, atual.utiLeitoId, atual.pacienteId)
  await tx.movimentacaoLeito.updateMany({ where: { internacaoId, hospitalId, fimEm: null }, data: { fimEm: saidaEm } })
  const alterada = await tx.internacao.updateMany({
    where: { id: internacaoId, hospitalId, saidaEm: null },
    data: {
      saidaEm, tipoSaida: dados.tipoSaida, destinoTransferencia: dados.destinoTransferencia, motivoSaida: dados.motivoSaida,
      encerradoPorId: ator.id, encerradoPorNome: ator.nome,
    },
  })
  if (alterada.count === 0) return falha('A internação foi alterada por outra pessoa. Atualize a tela.')

  const status = STATUS_DA_SAIDA[dados.tipoSaida]
  await tx.paciente.updateMany({ where: { id: atual.pacienteId, hospitalId }, data: { status, leitoTipo: null, leitoNumero: null } })
  const destino = dados.destinoTransferencia ? ` para ${dados.destinoTransferencia}` : ''
  await registrarEvento(tx, ator, atual.pacienteId, 'Saída da internação', `${ROTULO_SAIDA[dados.tipoSaida]}${destino}${dados.motivoSaida ? `. Motivo: ${dados.motivoSaida}` : ''}`)
  return { internacaoId, pacienteId: atual.pacienteId, statusAnterior: atual.paciente.status, status }
}

/** Internação aberta do paciente, se houver. */
export function buscarAberta(tx: Prisma.TransactionClient, hospitalId: string, pacienteId: string) {
  return tx.internacao.findFirst({ where: { hospitalId, pacienteId, saidaEm: null }, select: { id: true, setor: true, utiLeitoId: true } })
}
