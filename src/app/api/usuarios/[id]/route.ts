import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    const body = await request.json()

    // Garantir que o usuário sendo atualizado pertence ao mesmo hospital
    const usuarioExistente = await prisma.usuario.findFirst({ where: { id, hospitalId } })
    if (!usuarioExistente) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const updateData: any = { ...body }
    
    // Se a senha for enviada no PUT, ela deve ser hasheada
    if (updateData.senha) {
      updateData.senha = await bcrypt.hash(updateData.senha, 10)
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true }
    })

    return NextResponse.json(usuario)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const hospitalId = session.user.hospitalId
    const { id } = await params
    
    // Garantir que o usuário sendo deletado pertence ao mesmo hospital
    const usuarioExistente = await prisma.usuario.findFirst({ where: { id, hospitalId } })
    if (!usuarioExistente) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    await prisma.usuario.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 })
  }
}
