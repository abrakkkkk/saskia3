import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { Ator } from '@/lib/api-guard'
import { isTerminal } from '@/lib/paciente-status'
import { cpfValido, nascimentoParaInput, normalizarCpf } from '@/lib/utils'

export async function findPatientInHospital(id: string, hospitalId: string) {
  return prisma.paciente.findFirst({
    where: { id, hospitalId, arquivadoEm: null },
    select: { id: true },
  })
}

type PacienteAtivo =
  | { paciente: { id: string; nome: string; status: string }; bloqueio?: never }
  | { paciente?: never; bloqueio: NextResponse }

/** Único ponto que decide se um paciente aceita novos registros: 404 fora do hospital; 409 arquivado ou em Óbito. */
export async function pacienteAtivo(id: string, hospitalId: string): Promise<PacienteAtivo> {
  const paciente = await prisma.paciente.findFirst({
    where: { id, hospitalId },
    select: { id: true, nome: true, status: true, arquivadoEm: true },
  })
  if (!paciente) return { bloqueio: NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 }) }
  if (paciente.arquivadoEm) {
    return { bloqueio: NextResponse.json({ error: 'Paciente arquivado: restaure o cadastro antes de registrar' }, { status: 409 }) }
  }
  if (isTerminal(paciente.status)) {
    return { bloqueio: NextResponse.json({ error: 'Paciente em Óbito: prontuário somente leitura' }, { status: 409 }) }
  }
  return { paciente: { id: paciente.id, nome: paciente.nome, status: paciente.status } }
}

/** Evento oficial da timeline. Sempre chamado na mesma transação do registro clínico. */
export function registrarEvento(tx: Prisma.TransactionClient, ator: Ator, pacienteId: string, tipo: string, descricao: string) {
  return tx.timelineEvent.create({
    data: { pacienteId, tipo, descricao: descricao.slice(0, 5000), user: ator.nome, usuarioId: ator.id },
  })
}

/** Texto opcional: indefinido e vazio viram null; tipo errado ou acima do limite devolve undefined (inválido). */
export function textoOpcional(valor: unknown, limite: number): string | null | undefined {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string' || valor.length > limite) return undefined
  return valor.trim() || null
}

const LIMITES = {
  nome: 160, cpf: 20, rg: 30, sexo: 40, telefone: 40, email: 254, endereco: 300,
  convenio: 120, numConvenio: 80, mae: 160, pai: 160, profissao: 120, estadoCivil: 60,
  nacionalidade: 80, naturalidade: 120, religiao: 80, etnia: 80, tipoSanguineo: 20,
  alergias: 2000, classificacao: 40, leitoTipo: 40, consultorio: 120, queixaPrincipal: 2000,
} as const

type CampoTexto = keyof typeof LIMITES
const CAMPOS_TEXTO = Object.keys(LIMITES) as CampoTexto[]

export const CLASSIFICACOES = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul']
const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export type DadosPaciente = Partial<Record<CampoTexto, string | null>> & { nascimento?: Date | null; leitoNumero?: number | null }

/** Data civil gravada às 12:00Z: não desloca o dia em nenhum fuso do Brasil. */
export function parseNascimento(valor: string): Date | null {
  const dia = valor.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
  if (valor.length > 10 && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(valor)) return null
  const data = new Date(`${dia}T12:00:00.000Z`)
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dia) return null
  return dia > new Date().toISOString().slice(0, 10) ? null : data
}

/**
 * Validação única de POST e PUT. Só trata campos presentes no corpo.
 * Com `atual`, devolve apenas o que mudou: valor legado reenviado sem alteração não é reprovado.
 */
export function validarDadosPaciente(
  input: Record<string, unknown>,
  atual?: Record<string, unknown>,
): { erro: string; dados?: never } | { erro?: never; dados: DadosPaciente } {
  const dados: DadosPaciente = {}

  for (const campo of CAMPOS_TEXTO) {
    const bruto = input[campo]
    if (bruto === undefined) continue
    const valor = textoOpcional(bruto, LIMITES[campo])
    if (valor === undefined) return { erro: `Campo ${campo} inválido` }

    if (campo === 'cpf') {
      const digitos = normalizarCpf(valor) || null
      if (atual && digitos === (normalizarCpf(atual.cpf as string | null) || null)) continue
      if (digitos && !cpfValido(digitos)) return { erro: 'CPF inválido: confira os dígitos' }
      dados.cpf = digitos
      continue
    }

    if (atual && valor === ((atual[campo] as string | null | undefined) ?? null)) continue
    if (campo === 'nome' && !valor) return { erro: 'O nome é obrigatório' }
    if (campo === 'email' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return { erro: 'E-mail inválido' }
    if (campo === 'classificacao' && valor && !CLASSIFICACOES.includes(valor)) return { erro: 'Classificação inválida' }
    if (campo === 'tipoSanguineo') {
      const tipo = valor === 'Desconhecido' ? null : valor
      if (tipo && !TIPOS_SANGUINEOS.includes(tipo)) return { erro: 'Tipo sanguíneo inválido' }
      if (atual && tipo === ((atual.tipoSanguineo as string | null | undefined) ?? null)) continue
      dados.tipoSanguineo = tipo
      continue
    }
    dados[campo] = valor
  }

  if (input.nascimento !== undefined) {
    const bruto = input.nascimento
    if (bruto === null || bruto === '') {
      if (!atual || atual.nascimento) dados.nascimento = null
    } else {
      if (typeof bruto !== 'string' || bruto.length > 40) return { erro: 'Data de nascimento inválida' }
      const data = parseNascimento(bruto)
      if (!data) return { erro: 'Data de nascimento inválida' }
      if (!atual || nascimentoParaInput(atual.nascimento as Date | string | null) !== bruto.slice(0, 10)) dados.nascimento = data
    }
  }

  if (input.leitoNumero !== undefined) {
    const bruto = input.leitoNumero
    let numero: number | null = null
    if (bruto !== null && bruto !== '') {
      numero = typeof bruto === 'string' && /^\d+$/.test(bruto) ? Number(bruto) : typeof bruto === 'number' ? bruto : NaN
      if (!Number.isSafeInteger(numero) || numero < 1 || numero > 2_147_483_647) return { erro: 'Número do leito inválido' }
    }
    if (!atual || numero !== (atual.leitoNumero ?? null)) dados.leitoNumero = numero
  }

  return { dados }
}

/** Considera CPFs legados ainda gravados com máscara, até a migração normalizar a base. */
export async function cpfEmUso(hospitalId: string, cpf: string, ignorarId?: string) {
  const mascarado = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  const existente = await prisma.paciente.findFirst({
    where: { hospitalId, cpf: { in: [cpf, mascarado] }, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    select: { id: true },
  })
  return Boolean(existente)
}

export function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

const contem = (valor: string) => ({ contains: valor, mode: 'insensitive' as const })

function filtroCpf(digitos: string): Prisma.PacienteWhereInput[] {
  const mascarado = digitos.replace(/^(\d{3})(\d{1,3})?(\d{1,3})?(\d{1,2})?$/, (_, a, b, c, d) =>
    [a, b && `.${b}`, c && `.${c}`, d && `-${d}`].filter(Boolean).join(''))
  return [{ cpf: { contains: digitos } }, { cpf: { contains: mascarado } }]
}

function filtroTelefone(texto: string): Prisma.PacienteWhereInput[] {
  const digitos = texto.replace(/\D/g, '')
  const opcoes = new Set([texto])
  if (digitos) opcoes.add(digitos)
  if (digitos.length === 11) {
    opcoes.add(digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'))
    opcoes.add(digitos.replace(/(\d{2})(\d)(\d{4})(\d{4})/, '($1) $2 $3-$4'))
  }
  return [...opcoes].map(opcao => ({ telefone: { contains: opcao } }))
}

/** Filtros da query string, sempre escopados ao hospital. Os campos de contato só valem com `completa`. */
export function filtroPacientes(params: URLSearchParams, hospitalId: string, opcoes: { arquivados: boolean; completa: boolean }): Prisma.PacienteWhereInput {
  const e: Prisma.PacienteWhereInput[] = []
  const param = (nome: string) => params.get(nome)?.trim().slice(0, 160) ?? ''

  const q = param('q')
  if (q) {
    const digitos = q.replace(/\D/g, '')
    e.push({ OR: [{ nome: contem(q) }, ...(digitos ? filtroCpf(digitos) : [])] })
  }
  const nome = param('nome')
  if (nome) e.push({ nome: contem(nome) })
  const cpf = param('cpf').replace(/\D/g, '')
  if (cpf) e.push({ OR: filtroCpf(cpf) })
  const status = param('status')
  if (status) e.push({ status })
  const classificacao = param('classificacao')
  if (classificacao) e.push({ classificacao })
  const nascimento = param('nascimento')
  if (/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
    const inicio = new Date(`${nascimento}T00:00:00.000Z`)
    if (!Number.isNaN(inicio.getTime())) {
      e.push({ nascimento: { gte: inicio, lt: new Date(inicio.getTime() + 86_400_000) } })
    }
  }

  if (opcoes.completa) {
    const mae = param('mae')
    if (mae) e.push({ mae: contem(mae) })
    const endereco = param('endereco')
    if (endereco) e.push({ endereco: contem(endereco) })
    const sexo = param('sexo')
    if (sexo) e.push({ sexo })
    const telefone = param('telefone')
    if (telefone) e.push({ OR: filtroTelefone(telefone) })
  }

  return { hospitalId, arquivadoEm: opcoes.arquivados ? { not: null } : null, AND: e }
}

// Última triagem e última mudança de status: base do indicador de espera.
export const SELECT_REFERENCIA_ESPERA = {
  createdAt: true,
  triagens: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
  timelineEvents: { where: { tipo: 'Status' }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
} satisfies Prisma.PacienteSelect

type ReferenciaEspera = {
  createdAt: Date
  triagens: { createdAt: Date }[]
  timelineEvents: { createdAt: Date }[]
}

/** Cadastro só é a referência enquanto não houver triagem nem reentrada na fila. */
export function comEspera<T extends ReferenciaEspera>({ triagens, timelineEvents, ...resto }: T) {
  const datas = [triagens[0]?.createdAt, timelineEvents[0]?.createdAt].filter((d): d is Date => Boolean(d))
  const esperaDesde = datas.length > 0 ? new Date(Math.max(...datas.map(d => d.getTime()))) : resto.createdAt
  return { ...resto, esperaDesde }
}

export const SELECT_CADASTRO = {
  id: true, nome: true, cpf: true, rg: true, nascimento: true, sexo: true, telefone: true, email: true,
  endereco: true, convenio: true, numConvenio: true, mae: true, pai: true, profissao: true, estadoCivil: true,
  nacionalidade: true, naturalidade: true, religiao: true, etnia: true, tipoSanguineo: true, alergias: true,
  status: true, classificacao: true, leitoTipo: true, leitoNumero: true, consultorio: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.PacienteSelect
