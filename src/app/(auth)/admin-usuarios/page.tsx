'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, Check, LoaderCircle, Pencil, Plus, Search, ShieldCheck, UserRound, UserRoundX, X } from 'lucide-react'
import './usuarios.css'

type Cargo = 'ADMIN' | 'MEDICO' | 'ENFERMEIRO_ASSISTENCIAL' | 'TECNICO_ENFERMAGEM' | 'RECEPCIONISTA' | 'FARMACEUTICO' | 'OUTROS'
type Usuario = { id: string; nome: string; email: string; cargo: Cargo; ativo: boolean; createdAt: string }

const cargos: { value: Cargo; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MEDICO', label: 'Médico' },
  { value: 'ENFERMEIRO_ASSISTENCIAL', label: 'Enfermeiro assistencial' },
  { value: 'TECNICO_ENFERMAGEM', label: 'Técnico de enfermagem' },
  { value: 'RECEPCIONISTA', label: 'Recepcionista' },
  { value: 'FARMACEUTICO', label: 'Farmacêutico' },
  { value: 'OUTROS', label: 'Outros profissionais' },
]

export default function AdminUsuariosPage() {
  const { data: session, status } = useSession()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
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
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os usuários.')
      setError('')
      setUsuarios(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.cargo === 'ADMIN') {
      void Promise.resolve().then(loadUsers)
    }
  }, [loadUsers, session, status])

  const openCreate = () => {
    setEditing(null); setNome(''); setEmail(''); setSenha(''); setCargo('OUTROS'); setError(''); setNotice(''); setModal(true)
  }
  const openEdit = (user: Usuario) => {
    setEditing(user); setNome(user.nome); setEmail(user.email); setSenha(''); setCargo(user.cargo); setError(''); setNotice(''); setModal(true)
  }
  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const payload: Record<string, string> = { nome: nome.trim(), email: email.trim(), cargo }
      if (senha) payload.senha = senha
      const response = await fetch(editing ? `/api/usuarios/${editing.id}` : '/api/usuarios', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o usuário.')
      setModal(false); setNotice(editing ? 'Usuário atualizado.' : 'Usuário criado.'); await loadUsers()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao salvar usuário.')
    } finally { setSaving(false) }
  }
  const toggleActive = async (user: Usuario) => {
    setError(''); setNotice('')
    const action = user.ativo ? 'desativar' : 'reativar'
    if (!window.confirm(`Deseja ${action} ${user.nome}?`)) return
    try {
      const response = await fetch(`/api/usuarios/${user.id}`, user.ativo
        ? { method: 'DELETE' }
        : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: true }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `Não foi possível ${action} o usuário.`)
      setNotice(`Usuário ${user.ativo ? 'desativado' : 'reativado'}.`); await loadUsers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao alterar usuário.') }
  }

  if (status === 'loading' || (session?.user?.cargo === 'ADMIN' && loading)) return <main className="conteudo usuarios-page"><p className="usuarios-state"><LoaderCircle className="spin" size={20} /> Carregando usuários…</p></main>
  if (!session?.user) return <main className="conteudo usuarios-page"><p className="usuarios-alert"><AlertCircle size={18} /> Entre no sistema para continuar.</p></main>
  if (session.user.cargo !== 'ADMIN') return <main className="conteudo usuarios-page"><p className="usuarios-alert"><ShieldCheck size={18} /> Esta área é restrita ao administrador do hospital.</p></main>

  const filtered = usuarios.filter(user => `${user.nome} ${user.email} ${user.cargo}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="conteudo usuarios-page">
    <header className="usuarios-heading">
      <div><p className="usuarios-eyebrow">{session.user.hospitalNome}</p><h1>Usuários</h1><p>Gerencie os profissionais e o acesso ao sistema deste hospital.</p></div>
      <button className="usuarios-primary" onClick={openCreate}><Plus size={18} /> Novo usuário</button>
    </header>
    {(error || notice) && <div className={error ? 'usuarios-alert' : 'usuarios-notice'} role={error ? 'alert' : 'status'}>{error ? <AlertCircle size={18} /> : <Check size={18} />}{error || notice}</div>}
    <label className="usuarios-search"><Search size={18} aria-hidden="true" /><input aria-label="Buscar usuários por nome, e-mail ou cargo" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou cargo" /></label>
    {filtered.length === 0 ? <section className="usuarios-empty"><UserRound size={24} /><strong>{usuarios.length ? 'Nenhum resultado' : 'Nenhum usuário cadastrado'}</strong><span>{usuarios.length ? 'Tente outra busca.' : 'Cadastre os profissionais autorizados deste hospital.'}</span></section> : <section className="usuarios-list" aria-label="Lista de usuários">
      {filtered.map(user => <article className={`usuarios-card ${user.ativo ? '' : 'is-inactive'}`} key={user.id}>
        <div className="usuarios-avatar"><UserRound size={20} /></div><div className="usuarios-details"><strong>{user.nome}</strong><span>{user.email}</span><div className="usuarios-tags"><span>{cargos.find(item => item.value === user.cargo)?.label ?? user.cargo}</span><span className={user.ativo ? 'status-active' : 'status-inactive'}>{user.ativo ? 'Ativo' : 'Inativo'}</span></div></div>
        <div className="usuarios-actions"><button className="usuarios-icon-button" onClick={() => openEdit(user)} aria-label={`Editar ${user.nome}`} title="Editar"><Pencil size={17} /></button><button className="usuarios-icon-button" onClick={() => void toggleActive(user)} aria-label={`${user.ativo ? 'Desativar' : 'Reativar'} ${user.nome}`} title={user.ativo ? 'Desativar' : 'Reativar'}>{user.ativo ? <UserRoundX size={17} /> : <Check size={17} />}</button></div>
      </article>)}
    </section>}
    {modal && <div className="usuarios-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModal(false) }}><section className="usuarios-dialog" role="dialog" aria-modal="true" aria-labelledby="usuarios-dialog-title"><header><div><h2 id="usuarios-dialog-title">{editing ? 'Editar usuário' : 'Novo usuário'}</h2><p>Os dados ficam vinculados ao hospital da sua sessão.</p></div><button type="button" className="usuarios-icon-button" onClick={() => setModal(false)} aria-label="Fechar" disabled={saving}><X size={19} /></button></header><form onSubmit={saveUser}><label>Nome completo<input required maxLength={120} autoComplete="name" value={nome} onChange={event => setNome(event.target.value)} /></label><label>E-mail<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Cargo<select value={cargo} onChange={event => setCargo(event.target.value as Cargo)}>{cargos.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Senha {editing && <span className="usuarios-hint">(deixe em branco para manter a atual)</span>}<input required={!editing} minLength={12} type="password" autoComplete={editing ? 'new-password' : 'new-password'} value={senha} onChange={event => setSenha(event.target.value)} /></label>{error && <p className="usuarios-alert"><AlertCircle size={17} />{error}</p>}<footer><button type="button" className="usuarios-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button><button className="usuarios-primary" disabled={saving}>{saving && <LoaderCircle className="spin" size={17} />}{editing ? 'Salvar alterações' : 'Criar usuário'}</button></footer></form></section></div>}
  </main>
}
