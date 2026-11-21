import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { previaDocumento, processarEnvio } from '@/lib/rnds/fila'

type Contexto = { params: Promise<{ id: string }> }

// Prévia do documento FHIR montado e o resultado da validação contra os perfis oficiais (só o gestor da integração).
export async function GET(_request: Request, { params }: Contexto) {
  const { ator, negado } = await exigir('integracao:gerir')
  if (negado) return negado
  const { id } = await params
  try {
    const previa = await previaDocumento(id, ator.hospitalId)
    if (!previa) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    await auditar(ator, 'VER_DOCUMENTO_RNDS', 'EnvioRnds', id)
    return NextResponse.json(previa)
  } catch {
    return NextResponse.json({ error: 'Erro ao montar o documento' }, { status: 500 })
  }
}

// { acao: 'enviar' } envia (ou valida, em simulação) agora; { acao: 'reenfileirar' } volta para pendente.
export async function POST(request: Request, { params }: Contexto) {
  const { ator, negado } = await exigir('integracao:gerir')
  if (negado) return negado
  const { id } = await params
  const body = await lerJson(request)
  try {
    if (body?.acao === 'enviar') {
      const r = await processarEnvio(id, ator.hospitalId)
      if (!r) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
      await auditar(ator, 'ENVIAR_RNDS', 'EnvioRnds', id, { status: r.status })
      return NextResponse.json(r)
    }
    if (body?.acao === 'reenfileirar') {
      const r = await prisma.envioRnds.updateMany({ where: { id, hospitalId: ator.hospitalId }, data: { status: 'PENDENTE', ultimoErro: null, problemas: [] } })
      if (!r.count) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
      await auditar(ator, 'REENFILEIRAR_RNDS', 'EnvioRnds', id)
      return NextResponse.json({ id, status: 'PENDENTE' })
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar o item' }, { status: 500 })
  }
}
