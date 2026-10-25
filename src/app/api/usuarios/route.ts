import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

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
    const body = await request.json()
    const { nome, email, senha, cargo } = body
    const cargosPermitidos = ['ADMIN', 'MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM', 'RECEPCIONISTA', 'FARMACEUTICO', 'OUTROS']

    if (typeof nome !== 'string' || !nome.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof senha !== 'string' || senha.length < 12) {
       return NextResponse.json({ error: 'Nome, e-mail válido e senha com pelo menos 12 caracteres são obrigatórios' }, { status: 400 })
    }
    if (!cargosPermitidos.includes(cargo)) return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })

    const hash = await bcrypt.hash(senha, 12)

    const usuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: hash,
        cargo,
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
