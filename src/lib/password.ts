import bcrypt from 'bcryptjs'

const MIN_SENHA = 12
const MAX_SENHA_BYTES = 72
const BCRYPT_COST = 12

// Hash válido usado quando o usuário não existe, para o tempo de resposta não revelar e-mails cadastrados.
const HASH_FICTICIO = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZFOaR2Y1m0mP3b0q6Xn5V3l9mQe1Wy'

export const MENSAGEM_SENHA_INVALIDA = `A senha deve ter pelo menos ${MIN_SENHA} caracteres e no máximo ${MAX_SENHA_BYTES} bytes.`

export function isSenhaValida(senha: unknown): senha is string {
  return typeof senha === 'string'
    && senha.length >= MIN_SENHA
    && new TextEncoder().encode(senha).length <= MAX_SENHA_BYTES
}

export function hashSenha(senha: string) {
  return bcrypt.hash(senha, BCRYPT_COST)
}

export function compararSenha(senha: string, hash: string | null | undefined) {
  return bcrypt.compare(senha, hash ?? HASH_FICTICIO)
}
