import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { compararSenha } from '@/lib/password'
import {
  cifrarSegredo, conferirSegundoFator, decifrarSegredo, exigeMfa, gerarCodigosBackup, gerarSegredoMfa,
  uriOtpauth, verificarTotp,
} from '@/lib/mfa'

const SEM_CACHE = { 'Cache-Control': 'no-store' }

function resposta(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: SEM_CACHE })
}

/** Situação da verificação em duas etapas do próprio usuário. */
export async function GET() {
  const { ator, negado } = await exigir('autenticado', { semMfa: true })
  if (negado) return negado
  const usuario = await prisma.usuario.findFirst({
    where: { id: ator.id, hospitalId: ator.hospitalId, ativo: true },
    select: { mfaAtivo: true, mfaCodigosBackup: true },
  })
  if (!usuario) return resposta({ error: 'Não autorizado' }, 401)
  return resposta({
    ativo: usuario.mfaAtivo,
    obrigatorio: exigeMfa(ator.cargo),
    codigosRestantes: usuario.mfaAtivo ? usuario.mfaCodigosBackup.length : 0,
  })
}

/**
 * acao = 'iniciar'      → gera um segredo novo (ainda inativo) e devolve o QR Code
 * acao = 'confirmar'    → confere o 1º código do app, ativa e devolve os códigos de recuperação (uma vez)
 * acao = 'novos-codigos'→ com um código válido, troca os códigos de recuperação
 * acao = 'desativar'    → senha + código; não permitido para cargos em que é obrigatória
 */
export async function POST(request: NextRequest) {
  const { ator, negado } = await exigir('autenticado', { semMfa: true })
  if (negado) return negado
  const body = await lerJson(request)
  const acao = body?.acao
  const codigo = typeof body?.codigo === 'string' ? body.codigo.trim().slice(0, 32) : ''

  const usuario = await prisma.usuario.findFirst({
    where: { id: ator.id, hospitalId: ator.hospitalId, ativo: true },
    select: { email: true, senha: true, mfaAtivo: true, mfaSegredo: true, mfaUltimoPasso: true, mfaCodigosBackup: true },
  })
  if (!usuario) return resposta({ error: 'Não autorizado' }, 401)

  try {
    if (acao === 'iniciar') {
      if (usuario.mfaAtivo) return resposta({ error: 'A verificação em duas etapas já está ativa.' }, 409)
      const segredo = gerarSegredoMfa()
      await prisma.usuario.update({ where: { id: ator.id }, data: { mfaSegredo: cifrarSegredo(segredo), mfaUltimoPasso: null } })
      const uri = uriOtpauth(segredo, usuario.email)
      const qr = await QRCode.toDataURL(uri, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
      return resposta({ segredo, qr })
    }

    if (acao === 'confirmar') {
      if (usuario.mfaAtivo) return resposta({ error: 'A verificação em duas etapas já está ativa.' }, 409)
      const segredo = usuario.mfaSegredo ? decifrarSegredo(usuario.mfaSegredo) : null
      if (!segredo) return resposta({ error: 'Comece a configuração de novo.' }, 409)
      const passo = verificarTotp(segredo, codigo.replace(/\s/g, ''))
      if (passo == null) return resposta({ error: 'Código incorreto. Confira o horário do celular e digite o código atual.' }, 400)
      const { codigos, hashes } = gerarCodigosBackup()
      await prisma.usuario.update({
        where: { id: ator.id },
        data: { mfaAtivo: true, mfaUltimoPasso: passo, mfaCodigosBackup: hashes },
      })
      await auditar(ator, 'MFA_ATIVADO', 'Usuario', ator.id)
      return resposta({ ativo: true, codigos })
    }

    if (acao === 'novos-codigos' || acao === 'desativar') {
      if (!usuario.mfaAtivo) return resposta({ error: 'A verificação em duas etapas não está ativa.' }, 409)
      if (acao === 'desativar') {
        if (exigeMfa(ator.cargo)) return resposta({ error: 'Para o seu cargo, a verificação em duas etapas é obrigatória.' }, 403)
        const senha = typeof body?.senha === 'string' ? body.senha : ''
        if (!senha || !await compararSenha(senha.slice(0, 256), usuario.senha)) return resposta({ error: 'Senha incorreta.' }, 400)
      }
      const aceito = conferirSegundoFator(usuario, codigo)
      if (!aceito) return resposta({ error: 'Código incorreto.' }, 400)

      if (acao === 'desativar') {
        await prisma.usuario.update({
          where: { id: ator.id },
          data: { mfaAtivo: false, mfaSegredo: null, mfaUltimoPasso: null, mfaCodigosBackup: [] },
        })
        await auditar(ator, 'MFA_DESATIVADO', 'Usuario', ator.id)
        return resposta({ ativo: false })
      }
      const { codigos, hashes } = gerarCodigosBackup()
      await prisma.usuario.update({
        where: { id: ator.id },
        data: { ...('mfaUltimoPasso' in aceito ? { mfaUltimoPasso: aceito.mfaUltimoPasso } : {}), mfaCodigosBackup: hashes },
      })
      await auditar(ator, 'MFA_CODIGOS_RENOVADOS', 'Usuario', ator.id)
      return resposta({ ativo: true, codigos })
    }

    return resposta({ error: 'Ação inválida.' }, 400)
  } catch (error) {
    console.error('Erro na verificação em duas etapas:', error instanceof Error ? error.name : 'erro')
    return resposta({ error: 'Não foi possível concluir. Tente de novo.' }, 500)
  }
}
