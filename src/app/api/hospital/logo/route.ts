import { NextResponse } from 'next/server'
import { del, get, list, put } from '@vercel/blob'
import { auditar, exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'

const LIMITE = 1024 * 1024
const TIPOS: Record<string, { ext: string; confere: (b: Buffer) => boolean }> = {
  'image/png': { ext: 'png', confere: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { ext: 'jpg', confere: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { ext: 'webp', confere: b => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
}
const prefixo = (hospitalId: string) => `logos/${hospitalId}.`
// Caminho que fica salvo no hospital e serve de src nas telas e na receita (mesma origem, passa na CSP).
const urlDoLogo = () => `/api/hospital/logo?v=${Date.now()}`

/** Entrega o logotipo do hospital de quem está logado. Só o próprio hospital: o caminho nunca vem do cliente. */
export async function GET() {
  const { ator, negado } = await exigir('autenticado')
  if (negado) return negado

  try {
    const { blobs } = await list({ prefix: prefixo(ator.hospitalId), limit: 1 })
    if (blobs.length === 0) return NextResponse.json({ error: 'Logotipo não cadastrado' }, { status: 404 })
    const arquivo = await get(blobs[0].pathname, { access: 'private' })
    if (!arquivo || arquivo.statusCode !== 200) return NextResponse.json({ error: 'Logotipo indisponível' }, { status: 404 })
    return new Response(arquivo.stream, {
      headers: {
        'Content-Type': arquivo.blob.contentType,
        'Content-Length': String(arquivo.blob.size),
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao abrir o logotipo' }, { status: 500 })
  }
}

/** Envia o logotipo (PNG, JPG ou WEBP até 1 MB). Substitui o anterior. */
export async function POST(request: Request) {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const form = await request.formData().catch(() => null)
    const arquivo = form?.get('arquivo')
    if (!(arquivo instanceof File)) return NextResponse.json({ error: 'Selecione a imagem do logotipo' }, { status: 400 })
    const tipo = TIPOS[arquivo.type]
    if (!tipo) return NextResponse.json({ error: 'Use uma imagem PNG, JPG ou WEBP' }, { status: 400 })
    if (arquivo.size === 0 || arquivo.size > LIMITE) return NextResponse.json({ error: 'A imagem deve ter no máximo 1 MB' }, { status: 400 })

    const bytes = Buffer.from(await arquivo.arrayBuffer())
    if (!tipo.confere(bytes)) return NextResponse.json({ error: 'O arquivo não é uma imagem válida' }, { status: 400 })

    const antigos = await list({ prefix: prefixo(ator.hospitalId) })
    const caminho = `${prefixo(ator.hospitalId)}${tipo.ext}`
    await put(caminho, bytes, { access: 'private', contentType: arquivo.type, addRandomSuffix: false, allowOverwrite: true })
    const sobras = antigos.blobs.map(b => b.pathname).filter(p => p !== caminho)
    if (sobras.length) await del(sobras).catch(() => undefined)

    const logo = urlDoLogo()
    await prisma.hospital.update({ where: { id: ator.hospitalId }, data: { logo } })
    await auditar(ator, 'ATUALIZAR', 'Hospital', ator.hospitalId, { campo: 'logo' })
    return NextResponse.json({ logo })
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar o logotipo' }, { status: 500 })
  }
}

export async function DELETE() {
  const { ator, negado } = await exigir('admin:acesso')
  if (negado) return negado

  try {
    const { blobs } = await list({ prefix: prefixo(ator.hospitalId) })
    if (blobs.length) await del(blobs.map(b => b.pathname)).catch(() => undefined)
    await prisma.hospital.update({ where: { id: ator.hospitalId }, data: { logo: null } })
    await auditar(ator, 'ATUALIZAR', 'Hospital', ator.hospitalId, { campo: 'logo', removido: true })
    return NextResponse.json({ logo: null })
  } catch {
    return NextResponse.json({ error: 'Erro ao remover o logotipo' }, { status: 500 })
  }
}
