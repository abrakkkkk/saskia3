// Cliente HTTP da RNDS (Guia de Integração: https://rnds-guia.saude.gov.br/docs/rnds/ambientes e /docs/publico-alvo/ti/erros).
//   1) Token: GET https://{auth}/api/token com o certificado digital ICP-Brasil do estabelecimento (TLS mútuo).
//      Resposta { access_token, expires_in } válida por 30 minutos.
//   2) Envio: POST https://{ehr}/api/fhir/r4/Bundle com os cabeçalhos
//      X-Authorization-Server: Bearer {access_token} e Authorization: {CNS do profissional requisitante}.
//      Sucesso: 201 e o id da RNDS no fim do header location (ou content-location).
// Segredos só por variável de ambiente, por CNES: RNDS_CERT_PFX_<CNES> (arquivo .pfx/.p12 em base64) e RNDS_CERT_SENHA_<CNES>.
import { request } from 'node:https'

export const AMBIENTES = ['SIMULACAO', 'HOMOLOGACAO', 'PRODUCAO'] as const
export type Ambiente = (typeof AMBIENTES)[number]

export const ENDERECOS = {
  HOMOLOGACAO: { auth: 'ehr-auth-hmg.saude.gov.br', ehr: () => 'ehr-services.hmg.saude.gov.br' },
  PRODUCAO: { auth: 'ehr-auth.saude.gov.br', ehr: (uf: string) => `${uf.toLowerCase()}-ehr-services.saude.gov.br` },
} as const

export type Certificado = { pfx: Buffer; senha: string }

const nomeVariavel = (cnes: string) => `RNDS_CERT_PFX_${cnes}`

/** Lê o certificado do hospital (pelo CNES). Nunca registra nem devolve o conteúdo. */
export function certificadoDoHospital(cnes: string | null | undefined, env: NodeJS.ProcessEnv = process.env): Certificado | null {
  if (!cnes) return null
  const pfx = env[nomeVariavel(cnes)]?.trim()
  const senha = env[`RNDS_CERT_SENHA_${cnes}`]
  if (!pfx || senha === undefined) return null
  try {
    const buffer = Buffer.from(pfx, 'base64')
    return buffer.length > 100 ? { pfx: buffer, senha } : null
  } catch {
    return null
  }
}
export const variaveisCertificado = (cnes: string) => [nomeVariavel(cnes), `RNDS_CERT_SENHA_${cnes}`]

/** Remove números longos (CNS, CPF, CNES de pessoa) de mensagens vindas da RNDS antes de guardar ou exibir. */
export function sanitizar(texto: string, limite = 400) {
  return texto.replace(/\d{11,}/g, '[número omitido]').replace(/\s+/g, ' ').trim().slice(0, limite)
}

type Resposta = { status: number; headers: Record<string, string | string[] | undefined>; corpo: string }

function chamar(opcoes: { host: string; path: string; method: 'GET' | 'POST'; headers?: Record<string, string>; corpo?: string; certificado?: Certificado }): Promise<Resposta> {
  return new Promise((resolve, reject) => {
    const req = request({
      host: opcoes.host, path: opcoes.path, method: opcoes.method, port: 443, timeout: 20_000,
      headers: { accept: 'application/json', ...opcoes.headers, ...(opcoes.corpo ? { 'content-length': String(Buffer.byteLength(opcoes.corpo)) } : {}) },
      ...(opcoes.certificado ? { pfx: opcoes.certificado.pfx, passphrase: opcoes.certificado.senha } : {}),
    }, res => {
      let corpo = ''
      res.setEncoding('utf8')
      res.on('data', d => { if (corpo.length < 200_000) corpo += d })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, corpo }))
    })
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')))
    req.on('error', reject)
    if (opcoes.corpo) req.write(opcoes.corpo)
    req.end()
  })
}

const tokens = new Map<string, { valor: string; expiraEm: number }>()

async function obterToken(ambiente: Exclude<Ambiente, 'SIMULACAO'>, cnes: string, certificado: Certificado): Promise<string> {
  const chave = `${ambiente}:${cnes}`
  const guardado = tokens.get(chave)
  if (guardado && guardado.expiraEm > Date.now()) return guardado.valor
  const r = await chamar({ host: ENDERECOS[ambiente].auth, path: '/api/token', method: 'GET', certificado })
  if (r.status !== 200) throw new ErroRnds(`Token recusado pela RNDS (${r.status}). Confira o certificado ICP-Brasil e o credenciamento.`, r.status >= 500)
  let json: { access_token?: string; expires_in?: number }
  try { json = JSON.parse(r.corpo) } catch { throw new ErroRnds('Resposta do serviço de token em formato inesperado.', true) }
  if (!json.access_token) throw new ErroRnds('Serviço de token não devolveu access_token.', true)
  // O guia informa 30 min; renova 2 min antes para não usar token vencido.
  tokens.set(chave, { valor: json.access_token, expiraEm: Date.now() + 28 * 60_000 })
  return json.access_token
}

export class ErroRnds extends Error {
  constructor(mensagem: string, readonly temporario = false) { super(mensagem) }
}

/** Mensagem de um OperationOutcome da RNDS, sem números de identificação. */
export function mensagemOperationOutcome(corpo: string): string {
  try {
    const json = JSON.parse(corpo) as { issue?: { severity?: string; code?: string; diagnostics?: string; expression?: string[] }[] }
    const itens = (json.issue ?? []).map(i => [i.code, i.diagnostics, i.expression?.join(', ')].filter(Boolean).join(': '))
    if (itens.length) return sanitizar(itens.join(' | '))
  } catch { /* corpo não JSON */ }
  return sanitizar(corpo || 'sem detalhes')
}

/** Id da RNDS: o que vem depois da última barra do header location/content-location. */
export function idDaLocalizacao(headers: Resposta['headers']): string | null {
  const bruto = headers.location ?? headers['content-location']
  const valor = Array.isArray(bruto) ? bruto[0] : bruto
  if (!valor) return null
  const id = valor.replace(/\/+$/, '').split('/').pop()
  return id && /^[\w.-]{1,128}$/.test(id) ? id : null
}

export async function enviarDocumento(args: {
  ambiente: Exclude<Ambiente, 'SIMULACAO'>
  uf: string
  cnes: string
  cnsRequisitante: string
  certificado: Certificado
  documento: unknown
}): Promise<{ idRnds: string | null }> {
  const token = await obterToken(args.ambiente, args.cnes, args.certificado)
  const r = await chamar({
    host: ENDERECOS[args.ambiente].ehr(args.uf),
    path: '/api/fhir/r4/Bundle',
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Authorization-Server': `Bearer ${token}`, Authorization: args.cnsRequisitante },
    corpo: JSON.stringify(args.documento),
  })
  if (r.status === 401) tokens.delete(`${args.ambiente}:${args.cnes}`)
  if (r.status === 200 || r.status === 201) return { idRnds: idDaLocalizacao(r.headers) }
  throw new ErroRnds(`RNDS recusou (${r.status}): ${mensagemOperationOutcome(r.corpo)}`, r.status === 401 || r.status === 429 || r.status >= 500)
}
