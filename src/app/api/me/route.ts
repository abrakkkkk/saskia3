import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'
import { compararSenha, hashSenha, isSenhaValida, MENSAGEM_SENHA_INVALIDA } from '@/lib/password'

const MAX_NOME = 160
const MAX_AVATAR_CHARS = 1_400_000

function isValidAvatar(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string' || value.length > MAX_AVATAR_CHARS) return false
  return /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const usuario = await prisma.usuario.findFirst({
      where: { id: session.user.id, hospitalId },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        avatar: true,
        hospital: { select: { nome: true } },
      },
    })
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(usuario)
  } catch (error) {
    console.error('Erro ao buscar conta:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados da conta' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!isRecord(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome || nome.length > MAX_NOME) {
      return NextResponse.json({ error: 'Informe um nome válido de até 160 caracteres' }, { status: 400 })
    }
    if (body.avatar !== undefined && !isValidAvatar(body.avatar)) {
      return NextResponse.json({ error: 'A imagem de perfil é inválida ou excede o limite permitido' }, { status: 400 })
    }

    const senhaAtual = body.senhaAtual
    const novaSenha = body.novaSenha
    if (novaSenha !== undefined && novaSenha !== '') {
      if (typeof senhaAtual !== 'string' || !senhaAtual) {
        return NextResponse.json({ error: 'Informe a senha atual para alterá-la.' }, { status: 400 })
      }
      if (!isSenhaValida(novaSenha)) {
        return NextResponse.json({ error: MENSAGEM_SENHA_INVALIDA }, { status: 400 })
      }
    } else if (senhaAtual !== undefined && senhaAtual !== '') {
      return NextResponse.json({ error: 'Informe também a nova senha.' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findFirst({ where: { id: session.user.id, hospitalId } })
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const updateData: { nome: string; avatar?: string | null; senha?: string; sessionVersion?: { increment: number } } = { nome }
    if (body.avatar !== undefined) updateData.avatar = body.avatar as string | null
    if (typeof novaSenha === 'string' && novaSenha) {
      if (!await compararSenha(senhaAtual as string, usuario.senha)) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 })
      }
      updateData.senha = await hashSenha(novaSenha)
      updateData.sessionVersion = { increment: 1 }
    }

    const atualizado = await prisma.usuario.updateMany({
      where: { id: session.user.id, hospitalId },
      data: updateData,
    })
    if (atualizado.count === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const perfil = await prisma.usuario.findFirst({
      where: { id: session.user.id, hospitalId },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        avatar: true,
        hospital: { select: { nome: true } },
      },
    })
    if (!perfil) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(perfil)
  } catch (error) {
    console.error('Erro ao atualizar conta:', error)
    return NextResponse.json({ error: 'Erro ao atualizar dados da conta' }, { status: 500 })
  }
}
