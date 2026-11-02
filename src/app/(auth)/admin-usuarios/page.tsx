'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, Check, LoaderCircle, Pencil, Plus, ShieldCheck, UserRound, UserRoundX, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SearchInput } from '@/components/ui'
import { CARGO_LABEL, CARGOS, pode, type Cargo } from '@/lib/permissions'
import './usuarios.css'

type Usuario = { id: string; nome: string; email: string; cargo: Cargo; ativo: boolean; createdAt: string }

const rotuloCargo = (cargo: string) => CARGO_LABEL[cargo as Cargo] ?? cargo

export default function AdminUsuariosPage() {
  const { data: session, status } = useSession()
  const permitido = pode(session?.user?.cargo, 'admin:acesso')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cargo, setCargo] = useState<Cargo>('OUTROS')

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/usuarios', { cache: 'no-store' })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error || 'Não foi possível carregar os usuários.')
      if (!Array.isArray(data)) throw new Error('A resposta de usuários é inválida.')
      setLoadError('')
      setUsuarios(data as Usuario[])
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && permitido) void Promise.resolve().then(loadUsers)
  }, [loadUsers, permitido, status])

  useEffect(() => {
    if (!modal) return
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) setModal(false) }
    document.addEventListener('keydown', fechar)
    return () => document.removeEventListener('keydown', fechar)
  }, [modal, saving])

  const openCreate = () => {
    setEditing(null); setNome(''); setEmail(''); setSenha(''); setCargo('OUTROS'); setError(''); setNotice(''); setModal(true)
  }
  const openEdit = (user: Usuario) => {
    setEditing(user); setNome(user.nome); setEmail(user.email); setSenha(''); setCargo(user.cargo); setError(''); setNotice(''); setModal(true)
  }
  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const payload: Record<string, string> = { nome: nome.trim(), email: email.trim(), cargo }
      if (senha) payload.senha = senha
      const response = await fetch(editing ? `/api/usuarios/${editing.id}` : '/api/usuarios', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Não foi possível salvar o usuário.')
      setModal(false); setNotice(editing ? 'Usuário atualizado.' : 'Usuário criado.'); await loadUsers()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao salvar usuário.')
    } finally { setSaving(false) }
  }
  const toggleActive = async (user: Usuario) => {
    if (updatingUserId !== null) return
    setError(''); setNotice('')
    const action = user.ativo ? 'desativar' : 'reativar'
    if (!await confirm(`Deseja ${action} ${user.nome}?`)) return
    setUpdatingUserId(user.id)
    try {
      const response = await fetch(`/api/usuarios/${user.id}`, user.ativo
        ? { method: 'DELETE' }
        : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: true }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || `Não foi possível ${action} o usuário.`)
      setNotice(`Usuário ${user.ativo ? 'desativado' : 'reativado'}.`); await loadUsers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao alterar usuário.') }
    finally { setUpdatingUserId(null) }
  }

  if (status === 'loading' || (permitido && loading)) return <main className="conteudo usuarios-page"><LoadingState message="Carregando usuários…" /></main>
  if (!session?.user) return <main className="conteudo usuarios-page"><ErrorState message="Entre no sistema para continuar." /></main>
  if (!permitido) return <main className="conteudo usuarios-page"><p className="usuarios-alert" role="alert"><ShieldCheck size={18} aria-hidden="true" /> Esta área é restrita ao administrador do hospital.</p></main>

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = usuarios.filter(user => `${user.nome} ${user.email} ${rotuloCargo(user.cargo)} ${user.cargo}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))

  return <main className="conteudo usuarios-page">
    <PageHeader
      icon="las la-users-cog"
      title="Usuários"
      subtitle={`${session.user.hospitalNome ?? ''} · Gerencie os profissionais e o acesso ao sistema deste hospital.`}
      actions={<button type="button" className="usuarios-primary" onClick={openCreate}><Plus size={18} aria-hidden="true" /> Novo usuário</button>}
    />
    {loadError && <ErrorState message={loadError} onRetry={() => { setLoading(true); void loadUsers() }} />}
    {(error || notice) && !modal && <div className={error ? 'usuarios-alert' : 'usuarios-notice'} role={error ? 'alert' : 'status'}>{error ? <AlertCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{error || notice}</div>}
    {!loadError && <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, e-mail ou cargo" label="Buscar usuários por nome, e-mail ou cargo" />}
    {!loadError && (filtered.length === 0
      ? <EmptyState icon="las la-user-friends" message={usuarios.length ? 'Nenhum resultado. Tente outra busca.' : 'Nenhum usuário cadastrado. Cadastre os profissionais autorizados deste hospital.'} />
      : <section className="usuarios-list" aria-label="Lista de usuários">
        {filtered.map(user => <article className={`usuarios-card ${user.ativo ? '' : 'is-inactive'}`} key={user.id}>
          <div className="usuarios-avatar" aria-hidden="true"><UserRound size={20} /></div>
          <div className="usuarios-details"><strong>{user.nome}</strong><span>{user.email}</span>
            <div className="usuarios-tags"><span>{rotuloCargo(user.cargo)}</span><span className={user.ativo ? 'status-active' : 'status-inactive'}>{user.ativo ? 'Ativo' : 'Inativo'}</span></div></div>
          <div className="usuarios-actions">
            <button type="button" className="usuarios-icon-button" onClick={() => openEdit(user)} aria-label={`Editar ${user.nome}`} title="Editar"><Pencil size={17} aria-hidden="true" /></button>
            <button type="button" className="usuarios-icon-button" onClick={() => void toggleActive(user)} disabled={updatingUserId !== null} aria-label={`${user.ativo ? 'Desativar' : 'Reativar'} ${user.nome}`} title={user.ativo ? 'Desativar' : 'Reativar'}>
              {updatingUserId === user.id ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : user.ativo ? <UserRoundX size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
            </button>
          </div>
        </article>)}
      </section>)}
    {modal && <div className="usuarios-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModal(false) }}>
      <section className="usuarios-dialog" role="dialog" aria-modal="true" aria-labelledby="usuarios-dialog-title">
        <header>
          <div><h2 id="usuarios-dialog-title">{editing ? 'Editar usuário' : 'Novo usuário'}</h2><p>Os dados ficam vinculados ao hospital da sua sessão.</p></div>
          <button type="button" className="usuarios-icon-button" onClick={() => setModal(false)} aria-label="Fechar" disabled={saving}><X size={19} aria-hidden="true" /></button>
        </header>
        <form onSubmit={saveUser}>
          <label>Nome completo<input required maxLength={160} autoComplete="name" value={nome} onChange={event => setNome(event.target.value)} /></label>
          <label>E-mail<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Cargo<select value={cargo} onChange={event => setCargo(event.target.value as Cargo)}>{CARGOS.map(item => <option key={item} value={item}>{CARGO_LABEL[item]}</option>)}</select></label>
          <label>Senha {editing && <span className="usuarios-hint">(deixe em branco para manter a atual)</span>}
            <input required={!editing} minLength={12} maxLength={72} type="password" autoComplete="new-password" value={senha} onChange={event => setSenha(event.target.value)} />
            <span className="usuarios-hint">Mínimo de 12 caracteres.</span>
          </label>
          {error && <p className="usuarios-alert" role="alert"><AlertCircle size={17} aria-hidden="true" />{error}</p>}
          <footer>
            <button type="button" className="usuarios-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button type="submit" className="usuarios-primary" disabled={saving}>{saving && <LoaderCircle className="spin" size={17} aria-hidden="true" />}{editing ? 'Salvar alterações' : 'Criar usuário'}</button>
          </footer>
        </form>
      </section>
    </div>}
  </main>
}
