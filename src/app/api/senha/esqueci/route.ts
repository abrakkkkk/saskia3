import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { emailConfigurado, enviarEmail } from '@/lib/email'
import { registrarFalha, tentativasExcedidas } from '@/lib/rate-limit'

const SEM_CACHE = { 'Cache-Control': 'no-store' }
const VALIDADE_MS = 30 * 60 * 1000
const LIMITE_POR_EMAIL = 3
const LIMITE_POR_IP = 10
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mesma resposta exista ou não a conta: não revela quem tem cadastro.
const MENSAGEM_PADRAO = 'Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Ele vale por 30 minutos.'

function baseUrl(request: NextRequest) {
  // Preferir a URL fixa: o cabeçalho Host poderia ser forjado para desviar o link.
  const fixa = process.env.APP_URL || process.env.AUTH_URL
  return (fixa || request.nextUrl.origin).replace(/\/+$/, '')
}

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

export async function POST(request: NextRequest) {
  if (!emailConfigurado()) {
    return NextResponse.json(
      { error: 'A recuperação de senha por e-mail ainda não está disponível. Peça ao administrador do seu hospital para redefinir a senha.' },
      { status: 503, headers: SEM_CACHE },
    )
  }

  const body = await lerJson(request)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400, headers: SEM_CACHE })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido'
  const chaveEmail = `senha:${email}`
  const chaveIp = `senha-ip:${ip}`
  if (await tentativasExcedidas(chaveEmail, LIMITE_POR_EMAIL) || await tentativasExcedidas(chaveIp, LIMITE_POR_IP)) {
    // Silencioso: não confirma nada a quem insiste.
    return NextResponse.json({ mensagem: MENSAGEM_PADRAO }, { headers: SEM_CACHE })
  }
  await registrarFalha(chaveEmail)
  await registrarFalha(chaveIp)

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { email, ativo: true, hospital: { ativo: true } },
      select: { id: true, nome: true, email: true },
    })
    if (usuario) {
      const token = crypto.randomBytes(32).toString('base64url')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      await prisma.$transaction([
        // Só o link mais recente vale.
        prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId: usuario.id, usadoEm: null } }),
        prisma.tokenRedefinicaoSenha.create({ data: { usuarioId: usuario.id, tokenHash, expiraEm: new Date(Date.now() + VALIDADE_MS) } }),
      ])
      const link = `${baseUrl(request)}/redefinir-senha?token=${token}`
      const nome = escapar(usuario.nome.split(' ')[0] || 'olá')
      const html = `<p>Olá, ${nome}.</p>
<p>Recebemos um pedido para criar uma nova senha no Saskia.</p>
<p><a href="${link}">Criar nova senha</a></p>
<p>O link vale por 30 minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p>`
      const texto = `Olá, ${usuario.nome.split(' ')[0] || ''}.\n\nPara criar uma nova senha no Saskia, abra o link (vale por 30 minutos e só pode ser usado uma vez):\n${link}\n\nSe você não pediu, ignore este e-mail.`
      await enviarEmail(usuario.email, 'Saskia: criar nova senha', html, texto)
    }
  } catch (error) {
    console.error('Erro ao pedir nova senha:', error instanceof Error ? error.name : 'erro')
  }

  return NextResponse.json({ mensagem: MENSAGEM_PADRAO }, { headers: SEM_CACHE })
}
