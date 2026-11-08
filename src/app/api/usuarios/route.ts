import { NextResponse } from 'next/server'
import type { CargoUsuario } from '@prisma/client'
import { auditar, exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { hashSenha, isSenhaValida, MENSAGEM_SENHA_INVALIDA } from '@/lib/password'
import { CARGOS } from '@/lib/permissions'
import { lerRegistro } from '@/lib/registro-profissional'
import { lerAutorizacoes, SUGESTAO_POR_CARGO } from '@/lib/prescricao'

const CAMPOS = {
  id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true,
  conselho: true, registroNumero: true, registroUf: true, especialidade: true, rqe: true, prescricoesAutorizadas: true,
} as const
const cargosPermitidos = new Set<string>(CARGOS)

export async function GET() {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const usuarios = await prisma.usuario.findMany({
      where: { hospitalId: ator.hospitalId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
      select: CAMPOS,
    })
    return NextResponse.json(usuarios)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { nome, email, senha, cargo } = body

  if (typeof nome !== 'string' || !nome.trim() || nome.length > 160
    || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Informe nome e e-mail válidos' }, { status: 400 })
  }
  if (!isSenhaValida(senha)) return NextResponse.json({ error: MENSAGEM_SENHA_INVALIDA }, { status: 400 })
  if (typeof cargo !== 'string' || !cargosPermitidos.has(cargo)) return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })
  const registro = lerRegistro(body)
  if ('error' in registro) return NextResponse.json({ error: registro.error }, { status: 400 })
  const autorizacoes = lerAutorizacoes(body, cargo)
  if ('error' in autorizacoes) return NextResponse.json({ error: autorizacoes.error }, { status: 400 })
  // Quem prescreve precisa do registro no conselho: sem ele a receita impressa não tem validade.
  const efetivas = autorizacoes.data ?? (cargo === 'MEDICO' ? [...SUGESTAO_POR_CARGO.MEDICO] : [])
  if (efetivas.length > 0 && !registro.data.registroNumero) {
    return NextResponse.json({ error: 'Quem prescreve precisa do registro no conselho (número e UF)' }, { status: 400 })
  }

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: await hashSenha(senha),
        cargo: cargo as CargoUsuario,
        hospitalId: ator.hospitalId,
        ...registro.data,
        // Médico novo sem escolha explícita já nasce com a sugestão do cargo, como era antes; os demais, só se o gestor marcar.
        prescricoesAutorizadas: efetivas,
      },
      select: CAMPOS,
    })
    await auditar(ator, 'CRIAR', 'Usuario', usuario.id, { cargo: usuario.cargo })
    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
