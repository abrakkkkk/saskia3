import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashSenha, isSenhaValida, MENSAGEM_SENHA_INVALIDA } from '@/lib/password'
import { CARGOS } from '@/lib/permissions'
import { CargoUsuario } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const usuarios = await prisma.usuario.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true
        // omitimos a senha por segurança
      }
    })

    return NextResponse.json(usuarios)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const { nome, email, senha, cargo } = body as Record<string, unknown>
    const cargosPermitidos = new Set<string>(CARGOS)

    if (typeof nome !== 'string' || !nome.trim() || nome.length > 160 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isSenhaValida(senha)) {
       return NextResponse.json({ error: 'Nome, e-mail válido e senha entre 12 e 72 bytes são obrigatórios' }, { status: 400 })
    }
    if (typeof cargo !== 'string' || !cargosPermitidos.has(cargo)) return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })

    const hash = await hashSenha(senha)

    const usuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: hash,
        cargo: cargo as CargoUsuario,
        hospitalId
      },
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true }
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário. Email pode já estar em uso.' }, { status: 500 })
  }
}
