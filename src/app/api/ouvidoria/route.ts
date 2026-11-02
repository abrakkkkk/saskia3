import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { exigir, lerJson, LIMITE_LISTA } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { limparMarcador, prazoIso, separarResposta } from '@/lib/ouvidoria'
import { pode } from '@/lib/permissions'

const TIPOS = new Set(['Elogio', 'Sugestão', 'Reclamação', 'Denúncia'])

// `autorId` nunca sai desta rota: nem o ADMIN consegue ligar uma manifestação a quem a enviou.
const CAMPOS = {
  id: true, protocolo: true, tipo: true, setor: true, paciente: true,
  mensagem: true, status: true, prazo: true, createdAt: true,
} as const

type Registro = { mensagem: string } & Record<string, unknown>
const apresentar = <T extends Registro>(item: T) => ({ ...item, ...separarResposta(item.mensagem) })

export async function GET(request: NextRequest) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    // Consulta por protocolo: único meio de quem enviou anonimamente acompanhar a resposta.
    const protocolo = request.nextUrl.searchParams.get('protocolo')?.trim().toUpperCase()
    if (protocolo) {
      if (!/^OUV-\d{6}-[0-9A-F]{12}$/.test(protocolo)) return NextResponse.json({ error: 'Protocolo inválido' }, { status: 400 })
      const item = await prisma.ouvidoriaTicket.findFirst({ where: { protocolo, hospitalId: ator.hospitalId }, select: CAMPOS })
      if (!item) return NextResponse.json({ error: 'Protocolo não encontrado' }, { status: 404 })
      return NextResponse.json(apresentar(item))
    }

    const tickets = await prisma.ouvidoriaTicket.findMany({
      where: pode(ator.cargo, 'admin:acesso') ? { hospitalId: ator.hospitalId } : { hospitalId: ator.hospitalId, autorId: ator.id },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
      select: CAMPOS,
    })
    return NextResponse.json(tickets.map(apresentar))
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar manifestações' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  const body = await lerJson(request)
  if (!body) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const tipo = typeof body.tipo === 'string' ? body.tipo : ''
  const setor = typeof body.setor === 'string' ? body.setor.trim() : ''
  const anonimo = body.anonimo === true
  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const mensagem = typeof body.mensagem === 'string' ? limparMarcador(body.mensagem).trim() : ''
  if (!TIPOS.has(tipo) || !setor || setor.length > 120 || nome.length > 200 || !mensagem || mensagem.length > 5000 || (!anonimo && !nome)) {
    return NextResponse.json({ error: 'Tipo, setor, identificação e descrição válidos são obrigatórios' }, { status: 400 })
  }

  try {
    const anoMes = new Date().toISOString().slice(0, 7).replace('-', '')
    const protocolo = `OUV-${anoMes}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
    // Anonimato real: sem autor, sem nome e sem registro na trilha de auditoria.
    const ticket = await prisma.ouvidoriaTicket.create({
      data: {
        hospitalId: ator.hospitalId,
        autorId: anonimo ? null : ator.id,
        protocolo,
        tipo,
        setor,
        paciente: anonimo ? 'Anônimo' : nome,
        mensagem,
        status: 'ABERTO',
        prazo: prazoIso(),
      },
      select: CAMPOS,
    })
    return NextResponse.json(apresentar(ticket), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar manifestação' }, { status: 500 })
  }
}
