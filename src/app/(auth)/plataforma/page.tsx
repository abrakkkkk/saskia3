'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '@/components/ui'
import '@/components/ui/modulo.css'
import '@/components/ui/ui-extras.css'

type Hospital = { id: string; nome: string; cnpj: string; ativo: boolean; createdAt: string; _count: { usuarios: number } }
type Credenciais = { hospital: string; login: string; senha: string }

const FORM_VAZIO = { nome: '', cnpj: '', adminNome: '', adminEmail: '' }

export default function PlataformaPage() {
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [carregando, setCarregando] = useState(true)
  const [restrito, setRestrito] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState(FORM_VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null)
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/plataforma/hospitais', { cache: 'no-store' })
      if (r.status === 403 || r.status === 401) { setRestrito(true); return }
      if (!r.ok) throw new Error('Não foi possível carregar os hospitais.')
      setHospitais(await r.json())
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os hospitais.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(carregar) }, [carregar])

  const campo = (nome: keyof typeof FORM_VAZIO) => ({
    value: form[nome],
    onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [nome]: e.target.value })),
  })

  async function criar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setMensagem('')
    setCredenciais(null)
    try {
      const r = await fetch('/api/plataforma/hospitais', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const dados = await r.json().catch(() => null)
      if (!r.ok) { setMensagem(dados?.error ?? 'Não foi possível criar o hospital.'); return }
      setCredenciais({ hospital: dados.hospital.nome, login: dados.adminEmail, senha: dados.senhaInicial })
      setForm(FORM_VAZIO)
      setCopiado(false)
      void carregar()
    } finally {
      setEnviando(false)
    }
  }

  async function alternar(h: Hospital) {
    const acao = h.ativo ? 'Desativar' : 'Ativar'
    if (!await confirm(`${acao} o hospital "${h.nome}"? ${h.ativo ? 'Os usuários dele deixam de conseguir entrar.' : 'Ele volta a aparecer no login.'}`)) return
    const r = await fetch(`/api/plataforma/hospitais/${h.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: !h.ativo }) })
    if (!r.ok) { const d = await r.json().catch(() => null); setMensagem(d?.error ?? 'Não foi possível atualizar o hospital.'); return }
    setMensagem('')
    void carregar()
  }

  async function copiar() {
    if (!credenciais) return
    try {
      await navigator.clipboard.writeText(`Login: ${credenciais.login}\nSenha: ${credenciais.senha}`)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-city" title="Plataforma" subtitle="Criar hospitais clientes e controlar o acesso de cada um." />

      {!restrito && (
        <p>
          <Link href="/plataforma/documentos" className="btn btn-secondary">
            <i className="las la-folder-open" aria-hidden="true"></i> Documentos do acervo
          </Link>
        </p>
      )}

      {carregando && !restrito && hospitais.length === 0 && <LoadingState message="Carregando hospitais..." />}
      {restrito && <EmptyState icon="las la-lock" message="Esta área é restrita à operação da plataforma." />}
      {erro && <ErrorState message={erro} onRetry={() => void carregar()} />}

      {!restrito && !erro && (
        <>
          <Panel title="Novo hospital" icon="las la-plus-circle">
            <form onSubmit={criar}>
              <div className="mod-form-grid">
                <div className="form-group">
                  <label htmlFor="pl-nome">Nome do hospital</label>
                  <input id="pl-nome" required maxLength={160} {...campo('nome')} />
                </div>
                <div className="form-group">
                  <label htmlFor="pl-cnpj">CNPJ</label>
                  <input id="pl-cnpj" required inputMode="numeric" placeholder="00.000.000/0000-00" {...campo('cnpj')} />
                </div>
                <div className="form-group">
                  <label htmlFor="pl-admin">Nome do administrador</label>
                  <input id="pl-admin" required maxLength={160} {...campo('adminNome')} />
                </div>
                <div className="form-group">
                  <label htmlFor="pl-email">E-mail do administrador</label>
                  <input id="pl-email" type="email" required autoComplete="off" {...campo('adminEmail')} />
                </div>
              </div>
              {mensagem && <p role="alert" className="mod-aviso mod-aviso-erro">{mensagem}</p>}
              <div className="mod-acoes">
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  <i className="las la-check" aria-hidden="true"></i> {enviando ? 'Criando...' : 'Criar hospital'}
                </button>
              </div>
            </form>
          </Panel>

          {credenciais && (
            <Panel title="Acesso criado" icon="las la-key">
              <p className="mod-aviso mod-aviso-atencao" role="status">
                A senha aparece só agora. Copie e entregue ao administrador de {credenciais.hospital}; ele deve trocá-la no primeiro acesso (Minha Conta).
              </p>
              <p><strong>Login:</strong> {credenciais.login}</p>
              <p><strong>Senha:</strong> <code className="ui-num">{credenciais.senha}</code></p>
              <div className="mod-acoes">
                <button type="button" className="btn btn-secondary" onClick={() => void copiar()}>
                  <i className="las la-copy" aria-hidden="true"></i> {copiado ? 'Copiado' : 'Copiar login e senha'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setCredenciais(null)}>Já anotei, ocultar</button>
              </div>
            </Panel>
          )}

          <Panel title="Hospitais" icon="las la-hospital">
            {hospitais.length === 0 ? (
              <EmptyState icon="las la-hospital" message="Nenhum hospital cadastrado." />
            ) : (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr><th scope="col">Hospital</th><th scope="col">CNPJ</th><th scope="col">Usuários</th><th scope="col">Situação</th><th scope="col">Ação</th></tr>
                  </thead>
                  <tbody>
                    {hospitais.map(h => (
                      <tr key={h.id}>
                        <td><strong>{h.nome}</strong></td>
                        <td>{h.cnpj}</td>
                        <td>{h._count.usuarios}</td>
                        <td><Badge tone={h.ativo ? 'success' : 'neutral'}>{h.ativo ? 'Ativo' : 'Desativado'}</Badge></td>
                        <td>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => void alternar(h)}>
                            {h.ativo ? 'Desativar' : 'Ativar'}
                          </button>
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
    </div>
  )
}
