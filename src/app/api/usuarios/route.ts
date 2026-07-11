import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const usuarios = await prisma.usuario.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true
        // omitimos a senha por segurança
      }
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const body = await request.json()
    const { nome, email, senha, cargo } = body

    if (!nome || !email || !senha) {
       return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const hash = await bcrypt.hash(senha, 10)

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hash,
        cargo: cargo || 'OUTROS',
        hospitalId
      },
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true }
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao criar usuário. Email pode já estar em uso.' }, { status: 500 })
  }
}
