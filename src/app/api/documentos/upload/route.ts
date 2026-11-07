import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { exigirPlataforma } from '@/lib/plataforma'
import { CATEGORIAS_DOCUMENTO, SLUG_VALIDO } from '@/lib/documentos'

const PASTAS: string[] = Object.values(CATEGORIAS_DOCUMENTO).map(c => c.pasta)
const TIPOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const LIMITE = 150 * 1024 * 1024

/**
 * Autoriza o envio direto do navegador ao Blob (arquivos grandes não passam pela função).
 * Só a área Plataforma, só PDF/imagem, e o caminho precisa seguir o padrão: <pasta>/<nome-padrao>.<ext>.
 */
export async function POST(request: Request) {
  const { negado } = await exigirPlataforma()
  if (negado) return negado

  try {
    const body = (await request.json()) as HandleUploadBody
    const resposta = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const m = /^([a-z]+)\/([a-z0-9-]+)\.(pdf|png|jpe?g|webp)$/.exec(pathname)
        if (!m || !PASTAS.includes(m[1]) || !SLUG_VALIDO.test(m[2])) throw new Error('Nome de arquivo fora do padrão')
        return { allowedContentTypes: TIPOS, maximumSizeInBytes: LIMITE, addRandomSuffix: false, allowOverwrite: true }
      },
    })
    return NextResponse.json(resposta)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao autorizar o envio' }, { status: 400 })
  }
}
