// Fila de envio à RNDS (servidor): monta o documento a partir dos dados do Saskia, valida contra os perfis oficiais
// e envia (homologação/produção) ou só valida (simulação). Nada de dado de paciente em log ou mensagem de erro.
import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { cnsValido } from '@/lib/cns'
import { certificadoDoHospital, enviarDocumento, ErroRnds, sanitizar, type Ambiente } from './cliente'
import { ErroDocumentoRnds, gerarResultadoExame, gerarRiaRotina, type ExameRnds } from './documentos'
import { validarDocumento, type Problema } from './validador'

export const TIPOS_ENVIO = ['RIA_R', 'REL'] as const
export type TipoEnvio = (typeof TIPOS_ENVIO)[number]

/** Códigos do REL guardados na fila (sem identificação do paciente). Datas em ISO. */
export type DadosExameRel = Omit<ExameRnds, 'coletadoEm' | 'liberadoEm'> & { coletadoEm: string }

export async function configuracaoRnds(hospitalId: string) {
  const [config, unidade] = await Promise.all([
    prisma.integracaoRnds.findUnique({ where: { hospitalId } }),
    prisma.configFaturamento.findUnique({ where: { hospitalId }, select: { cnes: true, uf: true } }),
  ])
  const ambiente = (config?.ambiente ?? 'SIMULACAO') as Ambiente
  return {
    ambiente,
    identificadorSolicitante: config?.identificadorSolicitante ?? null,
    cnsRequisitante: config?.cnsRequisitante ?? null,
    envioAutomatico: config?.envioAutomatico ?? true,
    cnes: unidade?.cnes ?? null,
    uf: unidade?.uf ?? null,
    certificadoConfigurado: !!certificadoDoHospital(unidade?.cnes),
  }
}
export type ConfiguracaoRnds = Awaited<ReturnType<typeof configuracaoRnds>>

/** O que falta para enviar de verdade (homologação ou produção). Vazio = pronto. */
export function pendenciasConfiguracao(c: ConfiguracaoRnds): string[] {
  const p: string[] = []
  if (!c.cnes) p.push('CNES da unidade (Faturamento → Unidade)')
  if (!c.identificadorSolicitante) p.push('Identificador do solicitante RNDS (dado no credenciamento)')
  if (c.ambiente !== 'SIMULACAO') {
    if (!c.uf) p.push('UF da unidade (Faturamento → Unidade)')
    if (!c.cnsRequisitante || !cnsValido(c.cnsRequisitante)) p.push('CNS válido do profissional requisitante')
    if (!c.certificadoConfigurado) p.push('Certificado digital ICP-Brasil nas variáveis de ambiente')
  }
  return p
}

/** Coloca (ou recoloca) uma dose ou um exame na fila. Reenviar mantém o identificador local, como pede o guia. */
export async function enfileirar(args: {
  hospitalId: string
  tipo: TipoEnvio
  origemId: string
  ator: { id: string; nome: string }
  dadosExame?: DadosExameRel
}) {
  const dadosExame = args.dadosExame ? (args.dadosExame as unknown as Prisma.InputJsonValue) : undefined
  return prisma.envioRnds.upsert({
    where: { hospitalId_tipo_origemId: { hospitalId: args.hospitalId, tipo: args.tipo, origemId: args.origemId } },
    create: {
      hospitalId: args.hospitalId, tipo: args.tipo, origemId: args.origemId, identificadorLocal: `saskia-${randomUUID()}`,
      criadoPorId: args.ator.id, criadoPorNome: args.ator.nome, ...(dadosExame ? { dadosExame } : {}),
    },
    update: { status: 'PENDENTE', ultimoErro: null, problemas: [], ...(dadosExame ? { dadosExame } : {}) },
  })
}

type Montado = { ok: true; documento: Record<string, unknown> } | { ok: false; erro: string }

async function montarDocumento(envio: { tipo: string; origemId: string; hospitalId: string; identificadorLocal: string; idRnds: string | null; dadosExame: Prisma.JsonValue }, c: ConfiguracaoRnds): Promise<Montado> {
  const remetente = { identificadorSolicitante: c.identificadorSolicitante ?? (c.ambiente === 'SIMULACAO' ? '0' : ''), cnes: c.cnes ?? '' }
  try {
    if (envio.tipo === 'RIA_R') {
      const v = await prisma.vacinaAplicada.findFirst({
        where: { id: envio.origemId, hospitalId: envio.hospitalId },
        include: { paciente: { select: { cns: true, cpf: true } } },
      })
      if (!v) return { ok: false, erro: 'Dose não encontrada neste hospital.' }
      const prof = v.profissionalId
        ? await prisma.usuario.findFirst({ where: { id: v.profissionalId, hospitalId: envio.hospitalId }, select: { cns: true, cbo: true } })
        : null
      return {
        ok: true,
        documento: gerarRiaRotina({
          remetente, idLocal: envio.identificadorLocal, substituiIdRnds: envio.idRnds,
          paciente: { cns: v.paciente.cns, cpf: v.paciente.cpf },
          profissional: { cns: prof?.cns ?? '', cbo: prof?.cbo },
          vacina: {
            imunobiologico: v.imunobiologico, fabricante: v.fabricante, lote: v.lote, validade: v.validade, dose: v.dose,
            estrategia: v.estrategia, via: v.via, localAplicacao: v.localAplicacao, grupoAtendimento: v.grupoAtendimento,
            condicaoMaternal: v.condicaoMaternal, aplicadaEm: v.aplicadaEm, registroOrigem: v.registroOrigem, pais: v.pais,
          },
        }),
      }
    }
    if (envio.tipo === 'REL') {
      const exame = await prisma.exame.findFirst({
        where: { id: envio.origemId, hospitalId: envio.hospitalId },
        select: { liberadoEm: true, paciente: { select: { cns: true, cpf: true } } },
      })
      if (!exame) return { ok: false, erro: 'Exame não encontrado neste hospital.' }
      if (!exame.liberadoEm) return { ok: false, erro: 'Exame ainda não liberado (laudo).' }
      const d = envio.dadosExame as unknown as DadosExameRel | null
      if (!d) return { ok: false, erro: 'Faltam os códigos do exame para a RNDS.' }
      return {
        ok: true,
        documento: gerarResultadoExame({
          remetente, idLocal: envio.identificadorLocal, substituiIdRnds: envio.idRnds,
          paciente: { cns: exame.paciente.cns, cpf: exame.paciente.cpf },
          exame: { ...d, coletadoEm: new Date(d.coletadoEm), liberadoEm: exame.liberadoEm },
        }),
      }
    }
    return { ok: false, erro: 'Tipo de envio desconhecido.' }
  } catch (e) {
    if (e instanceof ErroDocumentoRnds) return { ok: false, erro: e.message }
    throw e
  }
}

export type ResultadoEnvio = { id: string; status: 'ENVIADO' | 'ERRO' | 'SIMULADO'; erro?: string; problemas?: Problema[] }

/** Processa um item: monta, valida contra os perfis oficiais e envia (ou só valida, em simulação). */
export async function processarEnvio(id: string, hospitalId: string, c?: ConfiguracaoRnds): Promise<ResultadoEnvio | null> {
  const envio = await prisma.envioRnds.findFirst({ where: { id, hospitalId } })
  if (!envio) return null
  const config = c ?? await configuracaoRnds(hospitalId)
  const salvar = (data: Prisma.EnvioRndsUpdateInput) =>
    prisma.envioRnds.update({ where: { id }, data: { ...data, ambiente: config.ambiente, tentativas: { increment: 1 } } })

  const montado = await montarDocumento(envio, config)
  if (!montado.ok) {
    await salvar({ status: 'ERRO', ultimoErro: montado.erro, problemas: [] })
    return { id, status: 'ERRO', erro: montado.erro }
  }
  const problemas = validarDocumento(montado.documento)
  if (problemas.length) {
    const erro = `Documento não passa no perfil oficial da RNDS (${problemas.length} problema${problemas.length > 1 ? 's' : ''}).`
    await salvar({ status: 'ERRO', ultimoErro: erro, problemas: problemas.slice(0, 50) as unknown as Prisma.InputJsonValue })
    return { id, status: 'ERRO', erro, problemas }
  }
  if (config.ambiente === 'SIMULACAO') {
    await salvar({ status: 'SIMULADO', ultimoErro: null, problemas: [] })
    return { id, status: 'SIMULADO' }
  }
  const faltas = pendenciasConfiguracao(config)
  const certificado = certificadoDoHospital(config.cnes)
  if (faltas.length || !certificado) {
    const erro = `Configuração incompleta: ${faltas.join('; ')}.`
    await salvar({ status: 'ERRO', ultimoErro: erro, problemas: [] })
    return { id, status: 'ERRO', erro }
  }
  try {
    const { idRnds } = await enviarDocumento({
      ambiente: config.ambiente, uf: config.uf!, cnes: config.cnes!, cnsRequisitante: config.cnsRequisitante!, certificado, documento: montado.documento,
    })
    await salvar({ status: 'ENVIADO', ultimoErro: null, problemas: [], idRnds: idRnds ?? envio.idRnds, enviadoEm: new Date() })
    return { id, status: 'ENVIADO' }
  } catch (e) {
    const erro = e instanceof ErroRnds ? e.message : `Falha de comunicação com a RNDS: ${sanitizar(e instanceof Error ? e.message : String(e), 120)}`
    await salvar({ status: 'ERRO', ultimoErro: erro, problemas: [] })
    return { id, status: 'ERRO', erro }
  }
}

/** Processa os pendentes do hospital (lote pequeno para caber no tempo de uma requisição). */
export async function processarPendentes(hospitalId: string, limite = 20) {
  const config = await configuracaoRnds(hospitalId)
  const pendentes = await prisma.envioRnds.findMany({ where: { hospitalId, status: 'PENDENTE' }, orderBy: { createdAt: 'asc' }, take: limite, select: { id: true } })
  const resultados: ResultadoEnvio[] = []
  for (const p of pendentes) {
    const r = await processarEnvio(p.id, hospitalId, config)
    if (r) resultados.push(r)
  }
  return resultados
}

/** Documento gerado para conferência (pré-visualização na tela, só para quem gere a integração). */
export async function previaDocumento(id: string, hospitalId: string) {
  const envio = await prisma.envioRnds.findFirst({ where: { id, hospitalId } })
  if (!envio) return null
  const montado = await montarDocumento(envio, await configuracaoRnds(hospitalId))
  return montado.ok ? { documento: montado.documento, problemas: validarDocumento(montado.documento) } : { erro: montado.erro }
}
