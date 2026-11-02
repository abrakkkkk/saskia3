import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import {
  CATEGORIAS_EQUIVALENTES,
  estaVencido,
  lerValidade,
  normalizarCategoria,
  normalizarLote,
} from '@/lib/estoque'

const MAXIMO = 2_147_483_647

export async function GET(request: NextRequest) {
  try {
    const parametro = request.nextUrl.searchParams.get('categoria')
    const categoria = parametro ? normalizarCategoria(parametro) : null
    if (parametro && !categoria) return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })

    const { ator, negado } = await exigir(categoria === 'ALMOXARIFADO' ? 'estoque:ler' : 'farmacia:ler')
    if (negado) return negado

    // FEFO: dentro do mesmo produto, o lote que vence primeiro vem antes.
    const items = await prisma.estoqueItem.findMany({
      where: {
        hospitalId: ator.hospitalId,
        ...(categoria ? { categoria: { in: CATEGORIAS_EQUIVALENTES[categoria] } } : {}),
      },
      orderBy: [{ nome: 'asc' }, { validade: { sort: 'asc', nulls: 'last' } }],
      take: LIMITE_LISTA,
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Erro ao buscar estoque:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar estoque' }, { status: 500 })
  }
}

class EntradaRecusada extends Error {}

function textoOpcional(valor: unknown, limite: number) {
  return valor === undefined || valor === null || (typeof valor === 'string' && valor.length <= limite)
}

function textoLimpo(valor: unknown) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

/** Cadastra o item ou, se o mesmo nome e lote já existem, registra a entrada no item existente. */
export async function POST(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('estoque:gerir')
    if (negado) return negado

    const body = await lerJson(request)
    if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const categoria = normalizarCategoria(body.categoria)
    const quantidade = Number(body.quantidade)
    const minimo = body.minimo === undefined || body.minimo === null || body.minimo === '' ? 0 : Number(body.minimo)
    if (
      typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 200 || !categoria ||
      !Number.isInteger(quantidade) || quantidade < 0 || quantidade > MAXIMO ||
      !Number.isInteger(minimo) || minimo < 0 || minimo > MAXIMO ||
      !textoOpcional(body.codigo, 100) || !textoOpcional(body.subcategoria, 100) ||
      !textoOpcional(body.unidade, 30) || !textoOpcional(body.lote, 100) || !textoOpcional(body.fornecedor, 200)
    ) {
      return NextResponse.json({ error: 'Dados incompletos ou inválidos' }, { status: 400 })
    }

    const validade = body.validade ? lerValidade(body.validade) : null
    if (body.validade && !validade) return NextResponse.json({ error: 'Data de validade inválida' }, { status: 400 })
    if (estaVencido(validade)) return NextResponse.json({ error: 'Não é possível dar entrada em item já vencido' }, { status: 400 })

    const nome = body.nome.trim()
    const lote = normalizarLote(body.lote)
    const fornecedor = textoLimpo(body.fornecedor)

    const { item, criado } = await prisma.$transaction(async tx => {
      const existente = await tx.estoqueItem.findFirst({
        where: {
          hospitalId: ator.hospitalId,
          categoria: { in: CATEGORIAS_EQUIVALENTES[categoria] },
          nome: { equals: nome, mode: 'insensitive' },
          lote,
        },
      })

      if (existente) {
        if (quantidade < 1) throw new EntradaRecusada('Este item já existe. Informe a quantidade da entrada.')
        if (existente.quantidade + quantidade > MAXIMO) throw new EntradaRecusada('A quantidade final excede o limite permitido')
        const trocaValidade = validade && existente.validade?.getTime() !== validade.getTime()
        if (trocaValidade && existente.quantidade > 0 && estaVencido(existente.validade)) {
          throw new EntradaRecusada('O saldo atual está vencido. Baixe-o por ajuste ou informe um novo lote.')
        }
        const atualizado = await tx.estoqueItem.update({
          where: { id: existente.id },
          data: {
            quantidade: { increment: quantidade },
            ...(trocaValidade ? { validade } : {}),
            ...(fornecedor ? { fornecedor } : {}),
          },
        })
        await tx.movimentacaoEstoque.create({
          data: {
            hospitalId: ator.hospitalId, tipo: 'ENTRADA', itemId: existente.id, quantidade,
            fornecedor, responsavel: ator.nome, usuarioId: ator.id,
          },
        })
        return { item: atualizado, criado: false }
      }

      const novo = await tx.estoqueItem.create({
        data: {
          hospitalId: ator.hospitalId,
          categoria,
          subcategoria: textoLimpo(body.subcategoria),
          nome,
          codigo: textoLimpo(body.codigo),
          quantidade,
          unidade: textoLimpo(body.unidade) ?? 'un',
          minimo,
          lote,
          validade,
          fornecedor,
        },
      })
      if (quantidade > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            hospitalId: ator.hospitalId, tipo: 'ENTRADA', itemId: novo.id, quantidade,
            fornecedor: fornecedor ?? 'Estoque inicial', responsavel: ator.nome, usuarioId: ator.id,
          },
        })
      }
      return { item: novo, criado: true }
    })

    await auditar(ator, criado ? 'ESTOQUE_ITEM_CRIADO' : 'ESTOQUE_ENTRADA', 'EstoqueItem', item.id, {
      quantidade, lote, validade: validade?.toISOString() ?? null,
    })
    return NextResponse.json(item, { status: criado ? 201 : 200 })
  } catch (error) {
    if (error instanceof EntradaRecusada) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Erro ao registrar item de estoque:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao registrar item de estoque' }, { status: 500 })
  }
}
