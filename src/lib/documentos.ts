/** Categorias do acervo. O valor vai para o banco; o rótulo é o que aparece na tela. */
export const CATEGORIAS_DOCUMENTO = {
  BIBLIOTECA: { pasta: 'biblioteca', rotulo: 'Documentos técnicos e protocolos' },
  CRESCIMENTO: { pasta: 'crescimento', rotulo: 'Curvas de crescimento' },
  VACINACAO: { pasta: 'vacinacao', rotulo: 'Calendários de vacinação' },
  FICHAS: { pasta: 'fichas', rotulo: 'Fichas auxiliares' },
} as const

export type CategoriaDocumento = keyof typeof CATEGORIAS_DOCUMENTO

export const ehCategoria = (v: unknown): v is CategoriaDocumento =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(CATEGORIAS_DOCUMENTO, v)

/** Padrão único de nome de arquivo: minúsculas, sem acento, só letras, números e hífens. */
export function paraSlug(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, '-mais')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type DocumentoItem = {
  slug: string
  titulo: string
  categoria: CategoriaDocumento
  grupo: string | null
  instituicao: string | null
  tags: string[]
  mime: string
  tamanho: number
}

/** Endereço do arquivo (exige login). */
export const urlDocumento = (slug: string, baixar = false) => `/api/documentos/${encodeURIComponent(slug)}${baixar ? '?baixar=1' : ''}`
