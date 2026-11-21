import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { cnsValido, somenteDigitos } from '@/lib/cns'
import { AMBIENTES, ENDERECOS, variaveisCertificado } from '@/lib/rnds/cliente'
import { configuracaoRnds, pendenciasConfiguracao } from '@/lib/rnds/fila'

// Situação da integração com a RNDS: configuração, pendências, endereços e contagem da fila por status.
export async function GET() {
  const { ator, negado } = await exigir('integracao:ler')
  if (negado) return negado
  try {
    const [config, contagem] = await Promise.all([
      configuracaoRnds(ator.hospitalId),
      prisma.envioRnds.groupBy({ by: ['status'], where: { hospitalId: ator.hospitalId }, _count: { _all: true } }),
    ])
    const endereco = config.ambiente === 'SIMULACAO' ? null
      : { auth: ENDERECOS[config.ambiente].auth, ehr: config.uf || config.ambiente === 'HOMOLOGACAO' ? ENDERECOS[config.ambiente].ehr(config.uf ?? '') : null }
    return NextResponse.json({
      ...config,
      cnsRequisitante: config.cnsRequisitante ? `${'•'.repeat(11)}${config.cnsRequisitante.slice(-4)}` : null,
      cnsRequisitanteInformado: !!config.cnsRequisitante,
      pendencias: pendenciasConfiguracao(config),
      variaveisCertificado: config.cnes ? variaveisCertificado(config.cnes) : null,
      endereco,
      fila: Object.fromEntries(contagem.map(c => [c.status, c._count._all])),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar a integração com a RNDS' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { ator, negado } = await exigir('integracao:gerir')
  if (negado) return negado
  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const data: { ambiente?: string; identificadorSolicitante?: string | null; cnsRequisitante?: string | null; envioAutomatico?: boolean } = {}
  if ('ambiente' in body) {
    if (typeof body.ambiente !== 'string' || !(AMBIENTES as readonly string[]).includes(body.ambiente)) return NextResponse.json({ error: 'Ambiente inválido' }, { status: 400 })
    data.ambiente = body.ambiente
  }
  if ('identificadorSolicitante' in body) {
    const v = somenteDigitos(body.identificadorSolicitante)
    if (v.length > 20) return NextResponse.json({ error: 'Identificador do solicitante inválido (só números)' }, { status: 400 })
    data.identificadorSolicitante = v || null
  }
  if ('cnsRequisitante' in body) {
    const v = somenteDigitos(body.cnsRequisitante)
    if (v && !cnsValido(v)) return NextResponse.json({ error: 'CNS do requisitante inválido' }, { status: 400 })
    data.cnsRequisitante = v || null
  }
  if ('envioAutomatico' in body) {
    if (typeof body.envioAutomatico !== 'boolean') return NextResponse.json({ error: 'Envio automático inválido' }, { status: 400 })
    data.envioAutomatico = body.envioAutomatico
  }
  try {
    await prisma.integracaoRnds.upsert({ where: { hospitalId: ator.hospitalId }, create: { hospitalId: ator.hospitalId, ...data }, update: data })
    await auditar(ator, 'CONFIGURAR_RNDS', 'IntegracaoRnds', null, { campos: Object.keys(data), ambiente: data.ambiente ?? null })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar a configuração da RNDS' }, { status: 500 })
  }
}
