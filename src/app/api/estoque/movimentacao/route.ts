import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { pode } from '@/lib/permissions'
import { isTerminal } from '@/lib/paciente-status'
import {
  CATEGORIAS_EQUIVALENTES,
  ehMedicamento,
  estaVencido,
  inicioDoDiaUtc,
  lerValidade,
  normalizarCategoria,
} from '@/lib/estoque'

const MAXIMO = 2_147_483_647
const LIMITE_PADRAO = 200

class MovimentacaoRecusada extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

export async function GET(request: NextRequest) {
  try {
    const parametro = request.nextUrl.searchParams.get('categoria')
    const categoria = parametro ? normalizarCategoria(parametro) : null
    if (parametro && !categoria) return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })

    const { ator, negado } = await exigir(categoria === 'ALMOXARIFADO' ? 'estoque:ler' : 'farmacia:ler')
    if (negado) return negado

    const limitePedido = Number(request.nextUrl.searchParams.get('limite'))
    const limite = Number.isInteger(limitePedido) && limitePedido > 0 ? Math.min(limitePedido, LIMITE_LISTA) : LIMITE_PADRAO

    const where = {
      hospitalId: ator.hospitalId,
      ...(categoria ? { item: { categoria: { in: CATEGORIAS_EQUIVALENTES[categoria] } } } : {}),
    }
    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const [itens, total, entradasHoje, saidasHoje] = await Promise.all([
      prisma.movimentacaoEstoque.findMany({
        where,
        select: {
          id: true, tipo: true, quantidade: true, setor: true, fornecedor: true,
          responsavel: true, observacao: true, createdAt: true,
          item: { select: { id: true, nome: true, lote: true, validade: true, unidade: true } },
          paciente: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limite,
      }),
      prisma.movimentacaoEstoque.count({ where }),
      prisma.movimentacaoEstoque.count({ where: { ...where, tipo: 'ENTRADA', createdAt: { gte: inicioHoje } } }),
      prisma.movimentacaoEstoque.count({ where: { ...where, tipo: 'SAIDA', createdAt: { gte: inicioHoje } } }),
    ])

    return NextResponse.json({ itens, total, entradasHoje, saidasHoje })
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 })
  }
}

function texto(valor: unknown) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('autenticado')
    if (negado) return negado

    const input = await lerJson(request)
    if (!input) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const { tipo, itemId, quantidade, pacienteId, setor, fornecedor, observacao, motivo, novaQuantidade } = input
    if ((tipo !== 'ENTRADA' && tipo !== 'SAIDA' && tipo !== 'AJUSTE') || typeof itemId !== 'string' || !itemId) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }
    for (const [campo, valor] of Object.entries({ pacienteId, setor, fornecedor, observacao, motivo })) {
      if (valor !== undefined && valor !== null && (typeof valor !== 'string' || valor.length > (campo === 'observacao' || campo === 'motivo' ? 2000 : 200))) {
        return NextResponse.json({ error: `Campo ${campo} inválido` }, { status: 400 })
      }
    }
    if (tipo === 'AJUSTE') {
      if (typeof novaQuantidade !== 'number' || !Number.isSafeInteger(novaQuantidade) || novaQuantidade < 0 || novaQuantidade > MAXIMO) {
        return NextResponse.json({ error: 'Informe a quantidade correta do item' }, { status: 400 })
      }
      if (!texto(motivo)) return NextResponse.json({ error: 'Informe o motivo do ajuste' }, { status: 400 })
    } else if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > MAXIMO) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 })
    }

    const novaValidade = input.validade ? lerValidade(input.validade) : null
    if (input.validade && !novaValidade) return NextResponse.json({ error: 'Data de validade inválida' }, { status: 400 })
    if (tipo === 'ENTRADA' && estaVencido(novaValidade)) {
      return NextResponse.json({ error: 'Não é possível dar entrada em item já vencido' }, { status: 400 })
    }

    const item = await prisma.estoqueItem.findFirst({
      where: { id: itemId, hospitalId: ator.hospitalId },
      select: { id: true, nome: true, categoria: true, quantidade: true, validade: true, lote: true },
    })
    if (!item) return NextResponse.json({ error: 'Item não encontrado no estoque' }, { status: 404 })

    const medicamento = ehMedicamento(item.categoria)
    const permitido = tipo === 'SAIDA' && medicamento
      ? pode(ator.cargo, 'farmacia:dispensar')
      : pode(ator.cargo, 'estoque:gerir')
    if (!permitido) return NextResponse.json({ error: 'Você não tem permissão para esta ação' }, { status: 403 })

    const idPaciente = tipo === 'SAIDA' ? texto(pacienteId) : null
    if (idPaciente) {
      const paciente = await prisma.paciente.findFirst({
        where: { id: idPaciente, hospitalId: ator.hospitalId, arquivadoEm: null },
        select: { status: true },
      })
      if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      if (isTerminal(paciente.status)) return NextResponse.json({ error: 'Paciente com óbito registrado não recebe dispensação' }, { status: 409 })
    }

    const resultado = await prisma.$transaction(async tx => {
      const base = { id: itemId, hospitalId: ator.hospitalId }

      if (tipo === 'SAIDA') {
        // Débito condicional: a validade é conferida na mesma operação que baixa o saldo.
        const baixa = await tx.estoqueItem.updateMany({
          where: {
            ...base,
            quantidade: { gte: quantidade as number },
            OR: [{ validade: null }, { validade: { gte: inicioDoDiaUtc() } }],
          },
          data: { quantidade: { decrement: quantidade as number } },
        })
        if (baixa.count === 0) {
          const atual = await tx.estoqueItem.findFirst({ where: base, select: { quantidade: true, validade: true } })
          if (!atual) throw new MovimentacaoRecusada('Item não encontrado no estoque', 404)
          if (estaVencido(atual.validade)) throw new MovimentacaoRecusada('Item vencido: a saída está bloqueada', 409)
          throw new MovimentacaoRecusada(`Estoque insuficiente. Disponível: ${atual.quantidade}`, 409)
        }
      } else if (tipo === 'ENTRADA') {
        const trocaValidade = novaValidade && item.validade?.getTime() !== novaValidade.getTime()
        if (trocaValidade && item.quantidade > 0 && estaVencido(item.validade)) {
          throw new MovimentacaoRecusada('O saldo atual está vencido. Baixe-o por ajuste ou cadastre um novo lote.', 409)
        }
        const entrada = await tx.estoqueItem.updateMany({
          where: { ...base, quantidade: { lte: MAXIMO - (quantidade as number) } },
          data: { quantidade: { increment: quantidade as number }, ...(trocaValidade ? { validade: novaValidade } : {}) },
        })
        if (entrada.count === 0) throw new MovimentacaoRecusada('A quantidade final excede o limite permitido')
      }

      let delta = quantidade as number
      if (tipo === 'AJUSTE') {
        const atual = await tx.estoqueItem.findFirst({ where: base, select: { quantidade: true } })
        if (!atual) throw new MovimentacaoRecusada('Item não encontrado no estoque', 404)
        delta = (novaQuantidade as number) - atual.quantidade
        if (delta === 0) throw new MovimentacaoRecusada('O saldo informado é igual ao atual')
        const ajuste = await tx.estoqueItem.updateMany({
          where: { ...base, quantidade: atual.quantidade },
          data: { quantidade: novaQuantidade as number },
        })
        if (ajuste.count === 0) throw new MovimentacaoRecusada('O saldo mudou. Atualize a tela e tente novamente.', 409)
      }

      return tx.movimentacaoEstoque.create({
        data: {
          hospitalId: ator.hospitalId,
          tipo,
          itemId,
          // AJUSTE guarda a diferença com sinal; ENTRADA e SAIDA, a quantidade movimentada.
          quantidade: delta,
          pacienteId: idPaciente,
          usuarioId: ator.id,
          setor: texto(setor),
          fornecedor: tipo === 'ENTRADA' ? texto(fornecedor) : null,
          responsavel: ator.nome,
          observacao: tipo === 'AJUSTE' ? `Motivo: ${texto(motivo)}` : texto(observacao),
        },
      })
    })

    await auditar(ator, `ESTOQUE_${tipo}`, 'EstoqueItem', itemId, {
      movimentacaoId: resultado.id,
      item: item.nome,
      lote: item.lote,
      quantidade: resultado.quantidade,
      pacienteId: idPaciente,
      ...(tipo === 'AJUSTE' ? { motivo: texto(motivo) } : {}),
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    if (error instanceof MovimentacaoRecusada) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Erro ao registrar movimentação:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
  }
}
