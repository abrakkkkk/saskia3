'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { upload } from '@vercel/blob/client'
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { CATEGORIAS_DOCUMENTO, paraSlug, urlDocumento, type CategoriaDocumento } from '@/lib/documentos'
import '@/components/ui/modulo.css'
import '@/components/ui/ui-extras.css'

type Doc = {
  slug: string; titulo: string; categoria: CategoriaDocumento; grupo: string | null; instituicao: string | null
  tags: string[]; mime: string; tamanho: number; ordem: number; ativo: boolean; arquivo: string
}

const CATEGORIAS = Object.entries(CATEGORIAS_DOCUMENTO) as [CategoriaDocumento, { pasta: string; rotulo: string }][]
const tamanho = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const extensao = (arquivo: string) => arquivo.slice(arquivo.lastIndexOf('.'))
const NOVO_VAZIO = { categoria: 'BIBLIOTECA' as CategoriaDocumento, titulo: '', slug: '', grupo: '', instituicao: '', tags: '' }

export default function DocumentosPlataformaPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [carregando, setCarregando] = useState(true)
  const [restrito, setRestrito] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [filtro, setFiltro] = useState<'TODAS' | CategoriaDocumento>('TODAS')

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [novo, setNovo] = useState(NOVO_VAZIO)
  const [progresso, setProgresso] = useState<number | null>(null)
  const [editando, setEditando] = useState<Doc | null>(null)
  const [edicao, setEdicao] = useState({ titulo: '', slug: '', grupo: '', instituicao: '', tags: '', ordem: '0' })

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/documentos?gerenciar=1', { cache: 'no-store' })
      if (r.status === 401 || r.status === 403) { setRestrito(true); return }
      if (!r.ok) throw new Error('Não foi possível carregar os documentos.')
      setDocs(await r.json())
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os documentos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(carregar) }, [carregar])

  const lista = docs.filter(d => filtro === 'TODAS' || d.categoria === filtro)
  const listaTags = (t: string) => t.split(',').map(x => x.trim()).filter(Boolean)

  function escolherArquivo(f: File | null) {
    setArquivo(f)
    if (f && !novo.titulo) {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
      setNovo(n => ({ ...n, titulo: base, slug: paraSlug(base) }))
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!arquivo) return
    setAviso('')
    const ext = (arquivo.name.match(/\.(pdf|png|jpe?g|webp)$/i)?.[0] ?? '').toLowerCase()
    if (!ext) { setAviso('Use PDF, PNG, JPG ou WEBP.'); return }
    const slug = paraSlug(novo.slug || novo.titulo)
    if (!slug || !novo.titulo.trim()) { setAviso('Informe o título e o nome do arquivo.'); return }
    const caminho = `${CATEGORIAS_DOCUMENTO[novo.categoria].pasta}/${slug}${ext}`
    setProgresso(0)
    try {
      const blob = await upload(caminho, arquivo, {
        access: 'private', handleUploadUrl: '/api/documentos/upload', multipart: arquivo.size > 8 * 1048576,
        onUploadProgress: p => setProgresso(Math.round(p.percentage)),
      })
      const r = await fetch('/api/documentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, titulo: novo.titulo.trim(), categoria: novo.categoria, grupo: novo.grupo, instituicao: novo.instituicao,
          tags: listaTags(novo.tags), arquivo: blob.pathname, mime: arquivo.type || 'application/pdf', tamanho: arquivo.size, hash: blob.etag,
        }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error ?? 'Não foi possível registrar o documento.')
      setAviso(`"${novo.titulo.trim()}" enviado e disponível para todos os usuários logados.`)
      setArquivo(null); setNovo(NOVO_VAZIO)
      void carregar()
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Falha no envio.')
    } finally {
      setProgresso(null)
    }
  }

  async function alternar(d: Doc) {
    const r = await fetch(`/api/documentos/${d.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: !d.ativo }) })
    if (!r.ok) { setAviso((await r.json().catch(() => null))?.error ?? 'Não foi possível atualizar.'); return }
    setAviso('')
    void carregar()
  }

  async function excluir(d: Doc) {
    if (!await confirm(`Excluir "${d.titulo}" de vez? O arquivo some do acervo e não dá para desfazer. Para só esconder, use Desligar.`)) return
    const r = await fetch(`/api/documentos/${d.slug}`, { method: 'DELETE' })
    if (!r.ok) { setAviso((await r.json().catch(() => null))?.error ?? 'Não foi possível excluir.'); return }
    setAviso(`"${d.titulo}" excluído.`)
    void carregar()
  }

  function abrirEdicao(d: Doc) {
    setEditando(d)
    setEdicao({ titulo: d.titulo, slug: d.slug, grupo: d.grupo ?? '', instituicao: d.instituicao ?? '', tags: d.tags.join(', '), ordem: String(d.ordem) })
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault()
    if (!editando) return
    const r = await fetch(`/api/documentos/${editando.slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: edicao.titulo, slug: paraSlug(edicao.slug), grupo: edicao.grupo, instituicao: edicao.instituicao, tags: listaTags(edicao.tags), ordem: Number(edicao.ordem) || 0 }),
    })
    if (!r.ok) { setAviso((await r.json().catch(() => null))?.error ?? 'Não foi possível salvar.'); return }
    setEditando(null); setAviso('Alterações salvas.')
    void carregar()
  }

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-folder-open" title="Documentos do acervo" subtitle="Enviar, renomear, ligar e desligar o que aparece na Biblioteca, Curvas, Vacinação e Fichas." />
      <p><Link href="/plataforma" className="btn btn-secondary btn-sm"><i className="las la-arrow-left" aria-hidden="true"></i> Voltar para Plataforma</Link></p>

      {carregando && !restrito && docs.length === 0 && <LoadingState message="Carregando documentos..." />}
      {restrito && <EmptyState icon="las la-lock" message="Esta área é restrita à operação da plataforma." />}
      {erro && <ErrorState message={erro} onRetry={() => void carregar()} />}

      {!restrito && !erro && (
        <>
          <Panel title="Enviar documento" icon="las la-cloud-upload-alt">
            <form onSubmit={enviar}>
              <div className="mod-form-grid">
                <div className="form-group">
                  <label htmlFor="dc-arquivo">Arquivo (PDF ou imagem, até 150 MB)</label>
                  <input id="dc-arquivo" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => escolherArquivo(e.target.files?.[0] ?? null)} />
                </div>
                <div className="form-group">
                  <label htmlFor="dc-cat">Categoria</label>
                  <select id="dc-cat" value={novo.categoria} onChange={e => setNovo(n => ({ ...n, categoria: e.target.value as CategoriaDocumento }))}>
                    {CATEGORIAS.map(([id, c]) => <option key={id} value={id}>{c.rotulo}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="dc-titulo">Título (como aparece na tela)</label>
                  <input id="dc-titulo" required maxLength={200} value={novo.titulo} onChange={e => setNovo(n => ({ ...n, titulo: e.target.value, slug: paraSlug(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="dc-slug">Nome do arquivo (padrão)</label>
                  <input id="dc-slug" required maxLength={100} value={novo.slug} onChange={e => setNovo(n => ({ ...n, slug: paraSlug(e.target.value) }))} aria-describedby="dc-slug-ajuda" />
                  <small id="dc-slug-ajuda">Minúsculas, sem acento, com hífens. Gerado a partir do título.</small>
                </div>
                <div className="form-group">
                  <label htmlFor="dc-grupo">Grupo (Meninas/Meninos nas curvas; MS, UFRGS... nas fichas)</label>
                  <input id="dc-grupo" maxLength={80} value={novo.grupo} onChange={e => setNovo(n => ({ ...n, grupo: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="dc-inst">Instituição de origem</label>
                  <input id="dc-inst" maxLength={120} value={novo.instituicao} onChange={e => setNovo(n => ({ ...n, instituicao: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="dc-tags">Palavras-chave (separadas por vírgula)</label>
                  <input id="dc-tags" value={novo.tags} onChange={e => setNovo(n => ({ ...n, tags: e.target.value }))} />
                </div>
              </div>
              {aviso && <p role="status" className="mod-aviso mod-aviso-atencao">{aviso}</p>}
              <div className="mod-acoes">
                <button type="submit" className="btn btn-primary" disabled={!arquivo || progresso !== null}>
                  <i className="las la-upload" aria-hidden="true"></i> {progresso !== null ? `Enviando… ${progresso}%` : 'Enviar'}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title={`Acervo (${lista.length})`} icon="las la-book-medical">
            <div className="form-group">
              <label htmlFor="dc-filtro">Mostrar</label>
              <select id="dc-filtro" value={filtro} onChange={e => setFiltro(e.target.value as 'TODAS' | CategoriaDocumento)}>
                <option value="TODAS">Todas as categorias</option>
                {CATEGORIAS.map(([id, c]) => <option key={id} value={id}>{c.rotulo}</option>)}
              </select>
            </div>
            {lista.length === 0 ? (
              <EmptyState icon="las la-folder-open" message="Nenhum documento nesta categoria." />
            ) : (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr><th scope="col">Título</th><th scope="col">Nome do arquivo</th><th scope="col">Categoria</th><th scope="col">Tamanho</th><th scope="col">Situação</th><th scope="col">Ações</th></tr>
                  </thead>
                  <tbody>
                    {lista.map(d => (
                      <tr key={d.slug}>
                        <td><strong>{d.titulo}</strong>{d.grupo && <><br /><small>{d.grupo}</small></>}</td>
                        <td><code>{d.slug}{extensao(d.arquivo)}</code></td>
                        <td>{CATEGORIAS_DOCUMENTO[d.categoria]?.rotulo ?? d.categoria}</td>
                        <td>{tamanho(d.tamanho)}</td>
                        <td><Badge tone={d.ativo ? 'success' : 'neutral'}>{d.ativo ? 'Visível' : 'Desligado'}</Badge></td>
                        <td>
                          <div className="mod-acoes">
                            <a className="btn btn-sm btn-secondary" href={urlDocumento(d.slug)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${d.titulo}`}>Abrir</a>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => abrirEdicao(d)} aria-label={`Editar ${d.titulo}`}>Editar</button>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => void alternar(d)} aria-label={`${d.ativo ? 'Desligar' : 'Ligar'} ${d.titulo}`}>{d.ativo ? 'Desligar' : 'Ligar'}</button>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => void excluir(d)} aria-label={`Excluir ${d.titulo}`}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {editando && (
        <Modal size="md" title="Editar documento" closeLabel="Fechar edição" onClose={() => setEditando(null)}>
          <form onSubmit={salvarEdicao}>
            <div className="form-group"><label htmlFor="ed-titulo">Título</label><input id="ed-titulo" required maxLength={200} value={edicao.titulo} onChange={e => setEdicao(s => ({ ...s, titulo: e.target.value }))} /></div>
            <div className="form-group">
              <label htmlFor="ed-slug">Nome do arquivo (padrão)</label>
              <input id="ed-slug" required maxLength={100} value={edicao.slug} onChange={e => setEdicao(s => ({ ...s, slug: paraSlug(e.target.value) }))} />
            </div>
            <div className="form-group"><label htmlFor="ed-grupo">Grupo</label><input id="ed-grupo" maxLength={80} value={edicao.grupo} onChange={e => setEdicao(s => ({ ...s, grupo: e.target.value }))} /></div>
            <div className="form-group"><label htmlFor="ed-inst">Instituição</label><input id="ed-inst" maxLength={120} value={edicao.instituicao} onChange={e => setEdicao(s => ({ ...s, instituicao: e.target.value }))} /></div>
            <div className="form-group"><label htmlFor="ed-tags">Palavras-chave (vírgula)</label><input id="ed-tags" value={edicao.tags} onChange={e => setEdicao(s => ({ ...s, tags: e.target.value }))} /></div>
            <div className="form-group"><label htmlFor="ed-ordem">Ordem na lista</label><input id="ed-ordem" type="number" value={edicao.ordem} onChange={e => setEdicao(s => ({ ...s, ordem: e.target.value }))} /></div>
            <div className="mod-acoes">
              <button type="submit" className="btn btn-primary">Salvar</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
