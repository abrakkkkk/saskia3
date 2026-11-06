import { NextRequest, NextResponse } from 'next/server'
import { auditar, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { hashSenha } from '@/lib/password'
import { exigirPlataforma, gerarSenhaInicial, normalizarCnpj } from '@/lib/plataforma'

const SEM_CACHE = { 'Cache-Control': 'no-store' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  const { negado } = await exigirPlataforma()
  if (negado) return negado
  const hospitais = await prisma.hospital.findMany({
    select: { id: true, nome: true, cnpj: true, ativo: true, createdAt: true, _count: { select: { usuarios: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(hospitais, { headers: SEM_CACHE })
}

/** Cria o hospital e o primeiro administrador. A senha inicial volta uma única vez na resposta. */
export async function POST(request: NextRequest) {
  const { ator, negado } = await exigirPlataforma()
  if (negado) return negado

  const body = await lerJson(request)
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
  const cnpj = normalizarCnpj(body?.cnpj)
  const adminNome = typeof body?.adminNome === 'string' ? body.adminNome.trim() : ''
  const adminEmail = typeof body?.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : ''
  if (!nome || nome.length > 160 || !adminNome || adminNome.length > 160) {
    return NextResponse.json({ error: 'Informe o nome do hospital e o nome do administrador (até 160 caracteres).' }, { status: 400, headers: SEM_CACHE })
  }
  if (!cnpj) return NextResponse.json({ error: 'CNPJ inválido. Use os 14 dígitos.' }, { status: 400, headers: SEM_CACHE })
  if (!EMAIL.test(adminEmail) || adminEmail.length > 200) {
    return NextResponse.json({ error: 'E-mail do administrador inválido.' }, { status: 400, headers: SEM_CACHE })
  }

  try {
    if (await prisma.hospital.findUnique({ where: { cnpj }, select: { id: true } })) {
      return NextResponse.json({ error: 'Já existe um hospital com esse CNPJ.' }, { status: 409, headers: SEM_CACHE })
    }
    if (await prisma.usuario.findUnique({ where: { email: adminEmail }, select: { id: true } })) {
      return NextResponse.json({ error: 'Já existe um usuário com esse e-mail.' }, { status: 409, headers: SEM_CACHE })
    }

    const senhaInicial = gerarSenhaInicial()
    const senha = await hashSenha(senhaInicial)
    const hospital = await prisma.$transaction(async tx => {
      const novo = await tx.hospital.create({ data: { nome, cnpj, ativo: true }, select: { id: true, nome: true, cnpj: true } })
      await tx.usuario.create({ data: { hospitalId: novo.id, nome: adminNome, email: adminEmail, senha, cargo: 'ADMIN' } })
      return novo
    })
    await auditar(ator, 'HOSPITAL_CRIADO', 'Hospital', hospital.id, { nome: hospital.nome, adminEmail })
    return NextResponse.json({ hospital, adminEmail, senhaInicial }, { status: 201, headers: SEM_CACHE })
  } catch (error) {
    console.error('Erro ao criar hospital:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Não foi possível criar o hospital.' }, { status: 500, headers: SEM_CACHE })
  }
}
