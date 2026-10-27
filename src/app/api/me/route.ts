import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isRecord } from '@/lib/request-validation'
import bcrypt from 'bcryptjs'

const MAX_NOME = 160
const MAX_AVATAR_CHARS = 1_400_000
const MAX_SENHA_BYTES = 72

function isPasswordLengthValid(value: string) {
  return value.length >= 4 && new TextEncoder().encode(value).length <= MAX_SENHA_BYTES
}

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
      if (typeof novaSenha !== 'string' || !isPasswordLengthValid(novaSenha)) {
        return NextResponse.json({ error: 'A nova senha deve ter pelo menos 4 caracteres e no máximo 72 bytes.' }, { status: 400 })
      }
    } else if (senhaAtual !== undefined && senhaAtual !== '') {
      return NextResponse.json({ error: 'Informe também a nova senha.' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findFirst({ where: { id: session.user.id, hospitalId } })
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const updateData: { nome: string; avatar?: string | null; senha?: string } = { nome }
    if (body.avatar !== undefined) updateData.avatar = body.avatar as string | null
    if (typeof novaSenha === 'string' && novaSenha) {
      const senhaValida = usuario.senha.startsWith('$2')
        ? await bcrypt.compare(senhaAtual as string, usuario.senha)
        : senhaAtual === usuario.senha
      if (!senhaValida) return NextResponse.json({ error: 'Senha atual incorreta!' }, { status: 400 })
      updateData.senha = await bcrypt.hash(novaSenha, 10)
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
