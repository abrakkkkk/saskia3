import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type CargoUsuario } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

const cargosPermitidos = new Set<CargoUsuario>([
  'ADMIN',
  'MEDICO',
  'ENFERMEIRO_ASSISTENCIAL',
  'TECNICO_ENFERMAGEM',
  'RECEPCIONISTA',
  'FARMACEUTICO',
  'OUTROS',
])

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

function isSerializationConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034'
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const { id } = await params
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const updateData: Prisma.UsuarioUpdateInput = {}
    if ('nome' in body) {
      if (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 160) return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
      updateData.nome = body.nome.trim()
    }
    if ('email' in body) {
      if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
      }
      updateData.email = body.email.trim().toLowerCase()
    }
    if ('cargo' in body) {
      if (typeof body.cargo !== 'string' || !cargosPermitidos.has(body.cargo as CargoUsuario)) {
        return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })
      }
      updateData.cargo = body.cargo as CargoUsuario
    }
    if ('ativo' in body) {
      if (typeof body.ativo !== 'boolean') return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      updateData.ativo = body.ativo
    }
    if ('senha' in body && body.senha !== '') {
      if (typeof body.senha !== 'string' || body.senha.length < 12 || new TextEncoder().encode(body.senha).length > 72) {
        return NextResponse.json({ error: 'A senha deve ter pelo menos 12 caracteres e no máximo 72 bytes' }, { status: 400 })
      }
      updateData.senha = await bcrypt.hash(body.senha, 12)
    }
    if (Object.keys(updateData).length === 0) return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 })

    const resultado = await prisma.$transaction(async tx => {
      const existing = await tx.usuario.findFirst({
        where: { id, hospitalId },
        select: { id: true, cargo: true, ativo: true },
      })
      if (!existing) return { error: 'nao_encontrado' as const }

      const willLoseAdminAccess = existing.cargo === 'ADMIN' && existing.ativo &&
        (updateData.ativo === false || (updateData.cargo !== undefined && updateData.cargo !== 'ADMIN'))
      if (willLoseAdminAccess) {
        if (existing.id === session.user.id) return { error: 'proprio_admin' as const }
        const activeAdmins = await tx.usuario.count({ where: { hospitalId, cargo: 'ADMIN', ativo: true } })
        if (activeAdmins <= 1) return { error: 'ultimo_admin' as const }
      }

      const atualizado = await tx.usuario.updateMany({ where: { id, hospitalId }, data: updateData })
      if (atualizado.count === 0) return { error: 'nao_encontrado' as const }
      const usuario = await tx.usuario.findFirst({
        where: { id, hospitalId },
        select: { id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true },
      })
      return { usuario }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if ('error' in resultado) {
      if (resultado.error === 'proprio_admin') return NextResponse.json({ error: 'Não é permitido remover seu próprio acesso de administrador' }, { status: 409 })
      if (resultado.error === 'ultimo_admin') return NextResponse.json({ error: 'O hospital precisa manter ao menos um administrador ativo' }, { status: 409 })
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(resultado.usuario)
  } catch (error) {
    if (isUniqueConstraintError(error)) return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'Os usuários foram alterados em paralelo. Atualize a lista e tente novamente.' }, { status: 409 })
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })

    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const existing = await tx.usuario.findFirst({
        where: { id, hospitalId },
        select: { id: true, cargo: true, ativo: true },
      })
      if (!existing) return { error: 'nao_encontrado' as const }
      if (existing.id === session.user.id) return { error: 'proprio_usuario' as const }

      if (existing.cargo === 'ADMIN' && existing.ativo) {
        const activeAdmins = await tx.usuario.count({ where: { hospitalId, cargo: 'ADMIN', ativo: true } })
        if (activeAdmins <= 1) return { error: 'ultimo_admin' as const }
      }

      const desativado = await tx.usuario.updateMany({ where: { id, hospitalId }, data: { ativo: false } })
      if (desativado.count === 0) return { error: 'nao_encontrado' as const }
      return { success: true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if ('error' in resultado) {
      if (resultado.error === 'proprio_usuario') return NextResponse.json({ error: 'Não é permitido desativar sua própria conta' }, { status: 409 })
      if (resultado.error === 'ultimo_admin') return NextResponse.json({ error: 'O hospital precisa manter ao menos um administrador ativo' }, { status: 409 })
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, ativo: false })
  } catch (error) {
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'Os usuários foram alterados em paralelo. Atualize a lista e tente novamente.' }, { status: 409 })
    return NextResponse.json({ error: 'Erro ao desativar usuário' }, { status: 500 })
  }
}
