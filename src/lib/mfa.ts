import crypto from 'node:crypto'

/**
 * Verificação em duas etapas por TOTP (RFC 6238: HMAC-SHA1, 6 dígitos, passo de 30 s),
 * compatível com Google Authenticator, Microsoft Authenticator, Authy etc.
 */
const PASSO_S = 30
const DIGITOS = 6
const JANELA = 1 // aceita o passo anterior e o seguinte (relógio do celular adiantado ou atrasado)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const EMISSOR_MFA = 'Saskia'
export const QTD_CODIGOS_BACKUP = 10

function base32(buf: Buffer): string {
  let bits = 0
  let valor = 0
  let saida = ''
  for (const byte of buf) {
    valor = ((valor << 8) | byte) & 0xffff
    bits += 8
    while (bits >= 5) {
      saida += B32[(valor >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) saida += B32[(valor << (5 - bits)) & 31]
  return saida
}

function deBase32(texto: string): Buffer {
  let bits = 0
  let valor = 0
  const bytes: number[] = []
  for (const c of texto.replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(c)
    if (i < 0) continue
    valor = ((valor << 5) | i) & 0xffff
    bits += 5
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

export function gerarSegredoMfa(): string {
  return base32(crypto.randomBytes(20))
}

function codigoNoPasso(segredo: string, passo: number): string {
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(BigInt(passo))
  const hmac = crypto.createHmac('sha1', deBase32(segredo)).update(contador).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const numero = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITOS
  return numero.toString().padStart(DIGITOS, '0')
}

export function passoAtual(agora = Date.now()) {
  return Math.floor(agora / 1000 / PASSO_S)
}

/**
 * Confere o código e devolve o passo aceito (para gravar e impedir reuso), ou null.
 * `ultimoPasso` recusa códigos iguais ou anteriores ao último aceito.
 */
export function verificarTotp(segredo: string, codigo: string, ultimoPasso?: number | null, agora = Date.now()): number | null {
  if (!/^\d{6}$/.test(codigo)) return null
  const atual = passoAtual(agora)
  for (let d = -JANELA; d <= JANELA; d++) {
    const passo = atual + d
    if (ultimoPasso != null && passo <= ultimoPasso) continue
    const esperado = codigoNoPasso(segredo, passo)
    if (crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(codigo))) return passo
  }
  return null
}

/** Código do passo atual; usado só nos testes automatizados. */
export function totpAtual(segredo: string, agora = Date.now()) {
  return codigoNoPasso(segredo, passoAtual(agora))
}

export function uriOtpauth(segredo: string, conta: string) {
  const rotulo = encodeURIComponent(`${EMISSOR_MFA}:${conta}`)
  return `otpauth://totp/${rotulo}?secret=${segredo}&issuer=${encodeURIComponent(EMISSOR_MFA)}&algorithm=SHA1&digits=${DIGITOS}&period=${PASSO_S}`
}

// ---- Segredo cifrado em repouso (AES-256-GCM, chave derivada de AUTH_SECRET) ----

function chave(): Buffer {
  const base = process.env.AUTH_SECRET
  if (!base) throw new Error('AUTH_SECRET ausente')
  return crypto.createHash('sha256').update(`saskia-mfa:${base}`).digest()
}

export function cifrarSegredo(segredo: string): string {
  const iv = crypto.randomBytes(12)
  const cifra = crypto.createCipheriv('aes-256-gcm', chave(), iv)
  const dados = Buffer.concat([cifra.update(segredo, 'utf8'), cifra.final()])
  return ['v1', iv.toString('base64url'), cifra.getAuthTag().toString('base64url'), dados.toString('base64url')].join('.')
}

export function decifrarSegredo(guardado: string): string | null {
  try {
    const [versao, iv, tag, dados] = guardado.split('.')
    if (versao !== 'v1' || !iv || !tag || !dados) return null
    const decifra = crypto.createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64url'))
    decifra.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decifra.update(Buffer.from(dados, 'base64url')), decifra.final()]).toString('utf8')
  } catch {
    return null
  }
}

// ---- Códigos de recuperação (uso único, guardados como SHA-256) ----

const ALFA_BACKUP = 'abcdefghjkmnpqrstuvwxyz23456789'

function normalizarCodigoBackup(codigo: string) {
  return codigo.replace(/[\s-]/g, '').toLowerCase()
}

function hashCodigoBackup(codigo: string) {
  return crypto.createHash('sha256').update(normalizarCodigoBackup(codigo)).digest('hex')
}

/** Gera códigos no formato xxxxx-xxxxx; devolve os textos (mostrar uma vez) e os hashes (gravar). */
export function gerarCodigosBackup() {
  const codigos = Array.from({ length: QTD_CODIGOS_BACKUP }, () => {
    const s = Array.from(crypto.randomBytes(10), b => ALFA_BACKUP[b % ALFA_BACKUP.length]).join('')
    return `${s.slice(0, 5)}-${s.slice(5)}`
  })
  return { codigos, hashes: codigos.map(hashCodigoBackup) }
}

type DadosMfa = { mfaSegredo: string | null; mfaUltimoPasso: number | null; mfaCodigosBackup: string[] }

/**
 * Confere um código de 6 dígitos (app autenticador) ou de recuperação.
 * Devolve o que gravar no usuário se aceitar (passo usado ou lista sem o código gasto), ou null.
 */
export function conferirSegundoFator(usuario: DadosMfa, codigo: string): { mfaUltimoPasso: number } | { mfaCodigosBackup: string[] } | null {
  const digitos = codigo.replace(/\s/g, '')
  if (/^\d{6}$/.test(digitos)) {
    const segredo = usuario.mfaSegredo ? decifrarSegredo(usuario.mfaSegredo) : null
    if (!segredo) return null
    const passo = verificarTotp(segredo, digitos, usuario.mfaUltimoPasso)
    return passo == null ? null : { mfaUltimoPasso: passo }
  }
  const limpo = normalizarCodigoBackup(codigo)
  if (limpo.length !== 10) return null
  const hash = hashCodigoBackup(limpo)
  if (!usuario.mfaCodigosBackup.includes(hash)) return null
  return { mfaCodigosBackup: usuario.mfaCodigosBackup.filter(h => h !== hash) }
}

/** Cargos que só usam o sistema com a verificação em duas etapas ligada. */
export function exigeMfa(cargo: string | null | undefined) {
  return cargo === 'ADMIN'
}
