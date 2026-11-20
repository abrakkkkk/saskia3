import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { hashSenha, isSenhaValida, MENSAGEM_SENHA_INVALIDA } from '@/lib/password'
import { limparFalhas } from '@/lib/rate-limit'

const SEM_CACHE = { 'Cache-Control': 'no-store' }
const LINK_INVALIDO = 'Este link não vale mais. Peça um novo em "Esqueci minha senha".'

/** Troca a senha com o token recebido por e-mail (uso único, 30 min). */
export async function POST(request: NextRequest) {
  const body = await lerJson(request)
  const token = typeof body?.token === 'string' ? body.token : ''
  const senha = body?.senha
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return NextResponse.json({ error: LINK_INVALIDO }, { status: 400, headers: SEM_CACHE })
  }
  if (!isSenhaValida(senha)) {
    return NextResponse.json({ error: MENSAGEM_SENHA_INVALIDA }, { status: 400, headers: SEM_CACHE })
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const novaSenha = await hashSenha(senha)
    const resultado = await prisma.$transaction(async tx => {
      // Marca como usado só se ainda estiver livre e no prazo: dois cliques não trocam a senha duas vezes.
      const agora = new Date()
      const marcado = await tx.tokenRedefinicaoSenha.updateMany({
        where: { tokenHash, usadoEm: null, expiraEm: { gt: agora }, usuario: { ativo: true } },
        data: { usadoEm: agora },
      })
      if (marcado.count !== 1) return null
      const registro = await tx.tokenRedefinicaoSenha.findUnique({ where: { tokenHash }, select: { usuarioId: true } })
      if (!registro) return null
      const usuario = await tx.usuario.update({
        where: { id: registro.usuarioId },
        // sessionVersion sobe: derruba sessões abertas com a senha antiga.
        data: { senha: novaSenha, sessionVersion: { increment: 1 } },
        select: { id: true, nome: true, email: true, cargo: true, hospitalId: true },
      })
      await tx.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId: usuario.id, usadoEm: null } })
      await tx.auditoria.create({
        data: {
          hospitalId: usuario.hospitalId, usuarioId: usuario.id, usuarioNome: usuario.nome, cargo: usuario.cargo,
          acao: 'SENHA_REDEFINIDA_POR_EMAIL', entidade: 'Usuario', entidadeId: usuario.id,
        },
      })
      return usuario
    })
    if (!resultado) return NextResponse.json({ error: LINK_INVALIDO }, { status: 400, headers: SEM_CACHE })
    await limparFalhas(`conta:${resultado.email}`)
    return NextResponse.json({ mensagem: 'Senha alterada. Entre com a nova senha.' }, { headers: SEM_CACHE })
  } catch (error) {
    console.error('Erro ao redefinir senha:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Não foi possível alterar a senha. Tente de novo.' }, { status: 500, headers: SEM_CACHE })
  }
}
