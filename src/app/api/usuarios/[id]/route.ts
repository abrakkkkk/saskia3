import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type CargoUsuario } from '@prisma/client'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { hashSenha, isSenhaValida, MENSAGEM_SENHA_INVALIDA } from '@/lib/password'
import { CARGOS } from '@/lib/permissions'

const cargosPermitidos = new Set<string>(CARGOS)
const CONFLITO = 'Os usuários foram alterados em paralelo. Atualize a lista e tente novamente.'

function codigo(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado
  const hospitalId = ator.hospitalId

  try {
    const { id } = await params
    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

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
      if (typeof body.cargo !== 'string' || !cargosPermitidos.has(body.cargo)) {
        return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })
      }
      updateData.cargo = body.cargo as CargoUsuario
    }
    if ('ativo' in body) {
      if (typeof body.ativo !== 'boolean') return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      updateData.ativo = body.ativo
      if (!body.ativo) updateData.sessionVersion = { increment: 1 }
    }
    if ('senha' in body && body.senha !== '') {
      if (!isSenhaValida(body.senha)) return NextResponse.json({ error: MENSAGEM_SENHA_INVALIDA }, { status: 400 })
      updateData.senha = await hashSenha(body.senha)
      updateData.sessionVersion = { increment: 1 }
    }
    if (Object.keys(updateData).length === 0) return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 })

    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.usuario.findFirst({ where: { id, hospitalId }, select: { id: true, cargo: true, ativo: true } })
      if (!existente) return { error: 'nao_encontrado' as const }

      const perdeAdmin = existente.cargo === 'ADMIN' && existente.ativo
        && (updateData.ativo === false || (updateData.cargo !== undefined && updateData.cargo !== 'ADMIN'))
      if (perdeAdmin) {
        if (existente.id === ator.id) return { error: 'proprio_admin' as const }
        const admins = await tx.usuario.count({ where: { hospitalId, cargo: 'ADMIN', ativo: true } })
        if (admins <= 1) return { error: 'ultimo_admin' as const }
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

    // Nunca registra valores de senha ou e-mail na trilha: só o que mudou.
    const alterados = Object.keys(body).filter(campo => campo !== 'senha' || body.senha !== '')
    await auditar(ator, 'ATUALIZAR', 'Usuario', id, { campos: alterados, cargo: resultado.usuario?.cargo ?? null })
    return NextResponse.json(resultado.usuario)
  } catch (error) {
    if (codigo(error) === 'P2002') return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    if (codigo(error) === 'P2034') return NextResponse.json({ error: CONFLITO }, { status: 409 })
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado
  const hospitalId = ator.hospitalId

  try {
    const { id } = await params
    const resultado = await prisma.$transaction(async tx => {
      const existente = await tx.usuario.findFirst({ where: { id, hospitalId }, select: { id: true, cargo: true, ativo: true } })
      if (!existente) return { error: 'nao_encontrado' as const }
      if (existente.id === ator.id) return { error: 'proprio_usuario' as const }

      if (existente.cargo === 'ADMIN' && existente.ativo) {
        const admins = await tx.usuario.count({ where: { hospitalId, cargo: 'ADMIN', ativo: true } })
        if (admins <= 1) return { error: 'ultimo_admin' as const }
      }

      // Desativar também derruba as sessões abertas do usuário.
      const desativado = await tx.usuario.updateMany({
        where: { id, hospitalId },
        data: { ativo: false, sessionVersion: { increment: 1 } },
      })
      if (desativado.count === 0) return { error: 'nao_encontrado' as const }
      return { success: true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if ('error' in resultado) {
      if (resultado.error === 'proprio_usuario') return NextResponse.json({ error: 'Não é permitido desativar sua própria conta' }, { status: 409 })
      if (resultado.error === 'ultimo_admin') return NextResponse.json({ error: 'O hospital precisa manter ao menos um administrador ativo' }, { status: 409 })
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    await auditar(ator, 'DESATIVAR', 'Usuario', id)
    return NextResponse.json({ success: true, ativo: false })
  } catch (error) {
    if (codigo(error) === 'P2034') return NextResponse.json({ error: CONFLITO }, { status: 409 })
    return NextResponse.json({ error: 'Erro ao desativar usuário' }, { status: 500 })
  }
}
