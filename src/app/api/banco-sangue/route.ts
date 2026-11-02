import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson } from '@/lib/api-guard'

const tiposPermitidos = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
const quantidadeMaxima = 2_147_483_647
const LIMITE_HISTORICO = 30

function statusDoEstoque(quantidade: number) {
  return quantidade < 5 ? 'CRÍTICO' : quantidade < 15 ? 'ALERTA' : 'NORMAL'
}

export async function GET() {
  try {
    const { ator, negado } = await exigir('sangue:ler')
    if (negado) return negado

    const [registros, movimentacoes] = await Promise.all([
      prisma.estoqueSangue.findMany({
        where: { hospitalId: ator.hospitalId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, tipo: true, quantidade: true },
      }),
      prisma.auditoria.findMany({
        where: { hospitalId: ator.hospitalId, entidade: 'EstoqueSangue' },
        orderBy: { createdAt: 'desc' },
        take: LIMITE_HISTORICO,
        select: { id: true, acao: true, usuarioNome: true, detalhes: true, createdAt: true },
      }),
    ])

    // Dados antigos podem ter mais de um registro por tipo: soma-os e usa o primeiro como id.
    const porTipo = new Map<string, { id: string; tipo: string; quantidade: number }>()
    for (const registro of registros) {
      const atual = porTipo.get(registro.tipo)
      if (atual) atual.quantidade += registro.quantidade
      else porTipo.set(registro.tipo, { ...registro })
    }
    const estoque = [...porTipo.values()]
      .map(item => ({ ...item, status: statusDoEstoque(item.quantidade) }))
      .sort((a, b) => a.tipo.localeCompare(b.tipo))

    return NextResponse.json({ estoque, movimentacoes }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Erro ao consultar estoque de sangue:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao consultar estoque de sangue' }, { status: 500 })
  }
}

/** Movimentação simples por tipo sanguíneo: { tipo, operacao: 'ENTRADA' | 'SAIDA', quantidade, motivo? }. */
export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('sangue:gerir')
    if (negado) return negado

    const body = await lerJson(request)
    const operacao = body?.operacao ?? 'ENTRADA'
    if (!body || typeof body.tipo !== 'string' || !tiposPermitidos.has(body.tipo)
      || (operacao !== 'ENTRADA' && operacao !== 'SAIDA')
      || typeof body.quantidade !== 'number' || !Number.isSafeInteger(body.quantidade)
      || body.quantidade < 1 || body.quantidade > quantidadeMaxima
      || (body.motivo !== undefined && body.motivo !== null && (typeof body.motivo !== 'string' || body.motivo.length > 500))) {
      return NextResponse.json({ error: 'Tipo sanguíneo, operação ou quantidade inválida' }, { status: 400 })
    }
    const tipo = body.tipo
    const quantidade = body.quantidade

    const resultado = await prisma.$transaction(async tx => {
      const registros = await tx.estoqueSangue.findMany({
        where: { hospitalId: ator.hospitalId, tipo },
        orderBy: { createdAt: 'asc' },
        select: { id: true, quantidade: true },
      })
      const totalAtual = registros.reduce((soma, registro) => soma + registro.quantidade, 0)
      const total = operacao === 'ENTRADA' ? totalAtual + quantidade : totalAtual - quantidade
      if (total < 0) return { erro: 'insuficiente' as const, disponivel: totalAtual }
      if (total > quantidadeMaxima) return { erro: 'limite' as const }

      const status = statusDoEstoque(total)
      const [primeiro, ...demais] = registros
      if (!primeiro) {
        return tx.estoqueSangue.create({ data: { hospitalId: ator.hospitalId, tipo, quantidade: total, status } })
      }
      // Consolida o saldo no primeiro registro, para não haver parcela negativa entre registros antigos.
      if (demais.length > 0) {
        await tx.estoqueSangue.updateMany({
          where: { hospitalId: ator.hospitalId, id: { in: demais.map(registro => registro.id) } },
          data: { quantidade: 0, status },
        })
      }
      await tx.estoqueSangue.updateMany({
        where: { id: primeiro.id, hospitalId: ator.hospitalId },
        data: { quantidade: total, status },
      })
      return tx.estoqueSangue.findFirst({ where: { id: primeiro.id, hospitalId: ator.hospitalId } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!resultado) return NextResponse.json({ error: 'Não foi possível registrar o estoque' }, { status: 500 })
    if ('erro' in resultado) {
      const mensagem = resultado.erro === 'insuficiente'
        ? `Saldo insuficiente de ${tipo}. Disponível: ${resultado.disponivel}`
        : 'A quantidade final excede o limite permitido'
      return NextResponse.json({ error: mensagem }, { status: 409 })
    }

    await auditar(ator, `SANGUE_${operacao}`, 'EstoqueSangue', resultado.id, {
      tipo, quantidade, saldo: resultado.quantidade,
      motivo: typeof body.motivo === 'string' && body.motivo.trim() ? body.motivo.trim() : null,
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'O estoque foi atualizado simultaneamente. Atualize os dados e tente novamente.' }, { status: 409 })
    }
    console.error('Erro ao registrar estoque de sangue:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar estoque de sangue' }, { status: 500 })
  }
}
