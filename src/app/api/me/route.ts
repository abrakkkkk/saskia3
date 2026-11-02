import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { compararSenha, hashSenha, isSenhaValida, MENSAGEM_SENHA_INVALIDA } from '@/lib/password'

const MAX_NOME = 160
const MAX_AVATAR_CHARS = 1_400_000
const CAMPOS_PERFIL = {
  id: true, nome: true, email: true, cargo: true, avatar: true,
  hospital: { select: { nome: true } },
} as const

function isValidAvatar(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string' || value.length > MAX_AVATAR_CHARS) return false
  return /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
}

export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id: ator.id, hospitalId: ator.hospitalId },
      select: CAMPOS_PERFIL,
    })
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(usuario)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados da conta' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  if (!nome || nome.length > MAX_NOME) {
    return NextResponse.json({ error: 'Informe um nome válido de até 160 caracteres' }, { status: 400 })
  }
  if (body.avatar !== undefined && !isValidAvatar(body.avatar)) {
    return NextResponse.json({ error: 'A imagem de perfil é inválida ou excede o limite permitido' }, { status: 400 })
  }

  const { senhaAtual, novaSenha } = body
  if (novaSenha !== undefined && novaSenha !== '') {
    if (typeof senhaAtual !== 'string' || !senhaAtual) {
      return NextResponse.json({ error: 'Informe a senha atual para alterá-la.' }, { status: 400 })
    }
    if (!isSenhaValida(novaSenha)) return NextResponse.json({ error: MENSAGEM_SENHA_INVALIDA }, { status: 400 })
  } else if (senhaAtual !== undefined && senhaAtual !== '') {
    return NextResponse.json({ error: 'Informe também a nova senha.' }, { status: 400 })
  }

  try {
    const where = { id: ator.id, hospitalId: ator.hospitalId }
    const usuario = await prisma.usuario.findFirst({ where, select: { senha: true } })
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const data: { nome: string; avatar?: string | null; senha?: string; sessionVersion?: { increment: number } } = { nome }
    if (body.avatar !== undefined) data.avatar = body.avatar as string | null
    const trocouSenha = typeof novaSenha === 'string' && novaSenha !== ''
    if (trocouSenha) {
      if (!await compararSenha(senhaAtual as string, usuario.senha)) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 })
      }
      data.senha = await hashSenha(novaSenha)
      data.sessionVersion = { increment: 1 }
    }

    const atualizado = await prisma.usuario.updateMany({ where, data })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    if (trocouSenha) await auditar(ator, 'TROCAR_SENHA', 'Usuario', ator.id)

    const perfil = await prisma.usuario.findFirst({ where, select: CAMPOS_PERFIL })
    if (!perfil) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json({ ...perfil, senhaAlterada: trocouSenha })
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar dados da conta' }, { status: 500 })
  }
}
