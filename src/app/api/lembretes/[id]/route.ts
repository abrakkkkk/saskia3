import { NextRequest, NextResponse } from 'next/server'
import { exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const TIPOS = new Set(['consulta', 'exame', 'cirurgia', 'pessoal'])
const STATUS = new Set(['Pendente', 'Concluído'])

const erro = (mensagem: string, status: number) => NextResponse.json({ error: mensagem }, { status })

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const { id } = await params
    const body = await lerJson(request)
    if (!body) return erro('Dados inválidos', 400)

    // Só o próprio autor altera: lembrete é pessoal, inclusive para o ADMIN.
    const where = { id, hospitalId: ator.hospitalId, criadoPorId: ator.id }
    const lembrete = await prisma.lembrete.findFirst({ where, select: { tipo: true } })
    if (!lembrete) return erro('Lembrete não encontrado', 404)

    const data: {
      titulo?: string; descricao?: string | null; dataHora?: Date; status?: string
      tipo?: string; relacionado?: string | null; concluido?: boolean
    } = {}

    if (body.titulo !== undefined) {
      if (typeof body.titulo !== 'string' || !body.titulo.trim() || body.titulo.trim().length > 200) return erro('Título inválido', 400)
      data.titulo = body.titulo.trim()
    }
    if (body.descricao !== undefined) {
      if (body.descricao !== null && (typeof body.descricao !== 'string' || body.descricao.length > 4000)) return erro('Descrição inválida', 400)
      data.descricao = body.descricao === '' ? null : body.descricao as string | null
    }
    if (body.dataHora !== undefined || body.data !== undefined) {
      const valor = body.dataHora ?? body.data
      if (typeof valor !== 'string' || !valor.trim()) return erro('Data inválida', 400)
      const convertida = new Date(valor)
      if (Number.isNaN(convertida.getTime())) return erro('Data inválida', 400)
      data.dataHora = convertida
    }
    if (body.tipo !== undefined) {
      // Registro antigo de "medicacao" pode ser salvo sem troca, mas o tipo não é mais escolhido.
      if (typeof body.tipo !== 'string' || (!TIPOS.has(body.tipo) && body.tipo !== lembrete.tipo)) return erro('Tipo inválido', 400)
      data.tipo = body.tipo
    }
    if (body.relacionado !== undefined) {
      if (body.relacionado !== null && (typeof body.relacionado !== 'string' || body.relacionado.length > 200)) return erro('Campo relacionado inválido', 400)
      data.relacionado = body.relacionado === '' ? null : body.relacionado as string | null
    }
    if (body.concluido !== undefined) {
      if (typeof body.concluido !== 'boolean') return erro('Conclusão inválida', 400)
      data.concluido = body.concluido
      data.status = body.concluido ? 'Concluído' : 'Pendente'
    }
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !STATUS.has(body.status)) return erro('Status inválido', 400)
      data.status = body.status
      if (body.concluido === undefined) data.concluido = body.status === 'Concluído'
    }
    if (Object.keys(data).length === 0) return erro('Nenhuma alteração informada', 400)

    const atualizado = await prisma.lembrete.updateMany({ where, data })
    if (atualizado.count === 0) return erro('Lembrete não encontrado', 404)
    return NextResponse.json(await prisma.lembrete.findFirst({ where }))
  } catch {
    return erro('Erro ao atualizar lembrete', 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const { id } = await params
    const removido = await prisma.lembrete.deleteMany({ where: { id, hospitalId: ator.hospitalId, criadoPorId: ator.id } })
    if (removido.count === 0) return erro('Lembrete não encontrado', 404)
    return NextResponse.json({ success: true })
  } catch {
    return erro('Erro ao excluir lembrete', 500)
  }
}
