'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Check, LoaderCircle, Pencil, Plus, UserRoundX } from 'lucide-react'
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, SearchInput } from '@/components/ui'
import { Modal } from '@/components/ui/Modal';
import { CARGO_LABEL, CARGOS, pode, type Cargo } from '@/lib/permissions'
import { formatarRegistro } from '@/lib/registro-profissional'
import { podeReceberAutorizacao, SUGESTAO_POR_CARGO, tipoPrescricao, TIPOS_PRESCRICAO } from '@/lib/prescricao'
import CamposRegistro, { REGISTRO_VAZIO, registroDoUsuario, type RegistroForm } from '@/components/ui/CamposRegistro'
import '@/components/ui/modulo.css'
import '@/components/ui/ui-extras.css'
import './usuarios.css'

type Usuario = {
  id: string; nome: string; email: string; cargo: Cargo; ativo: boolean; createdAt: string
  conselho?: string | null; registroNumero?: string | null; registroUf?: string | null; especialidade?: string | null; rqe?: string | null
  prescricoesAutorizadas?: string[]
}

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
  const [registro, setRegistro] = useState<RegistroForm>(REGISTRO_VAZIO)
  const [prescricoes, setPrescricoes] = useState<string[]>([])

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

  const openCreate = () => {
    setEditing(null); setNome(''); setEmail(''); setSenha(''); setCargo('OUTROS'); setRegistro(REGISTRO_VAZIO); setPrescricoes([]); setError(''); setNotice(''); setModal(true)
  }
  const openEdit = (user: Usuario) => {
    setEditing(user); setNome(user.nome); setEmail(user.email); setSenha(''); setCargo(user.cargo); setRegistro(registroDoUsuario(user)); setPrescricoes(user.prescricoesAutorizadas ?? []); setError(''); setNotice(''); setModal(true)
  }
  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const payload: Record<string, unknown> = { nome: nome.trim(), email: email.trim(), cargo, ...registro }
      if (podeReceberAutorizacao(cargo)) payload.prescricoesAutorizadas = prescricoes
      else if (editing) payload.prescricoesAutorizadas = []
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

  if (status === 'loading' || (permitido && loading)) return <main className="mod-pagina"><PageHeader icon="las la-users-cog" title="Usuários" /><LoadingState message="Carregando usuários..." /></main>
  if (!session?.user) return <main className="mod-pagina"><PageHeader icon="las la-users-cog" title="Usuários" /><ErrorState message="Entre no sistema para continuar." /></main>
  if (!permitido) return <main className="mod-pagina"><PageHeader icon="las la-users-cog" title="Usuários" /><p className="mod-aviso mod-aviso-erro" role="alert">Esta área é restrita ao administrador do hospital.</p></main>

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = usuarios.filter(user => `${user.nome} ${user.email} ${rotuloCargo(user.cargo)} ${user.cargo}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))

  return <main className="mod-pagina">
    <PageHeader
      icon="las la-users-cog"
      title="Usuários"
      subtitle={`${session.user.hospitalNome ? session.user.hospitalNome + ' · ' : ''}Profissionais e acesso ao sistema.`}
      actions={<button type="button" className="btn btn-primary" onClick={openCreate}><Plus size={18} aria-hidden="true" /> Novo usuário</button>}
    />
    {loadError && <ErrorState message={loadError} onRetry={() => { setLoading(true); void loadUsers() }} />}
    {(error || notice) && !modal && <div className={`mod-aviso ${error ? 'mod-aviso-erro' : 'mod-aviso-sucesso'}`} role={error ? 'alert' : 'status'}>{error || notice}</div>}
    {!loadError && <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, e-mail ou cargo" label="Buscar usuários por nome, e-mail ou cargo" />}
    {!loadError && (filtered.length === 0
      ? <EmptyState icon="las la-user-friends" message={usuarios.length ? 'Nenhum resultado. Tente outra busca.' : 'Nenhum usuário cadastrado. Cadastre os profissionais autorizados deste hospital.'} />
      : <div className="tabela-wrapper">
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Cargo</th><th>Registro</th><th>Prescreve</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map(user => <tr key={user.id}>
              <td><strong>{user.nome}</strong></td>
              <td className="us-email">{user.email}</td>
              <td>{rotuloCargo(user.cargo)}</td>
              <td>{formatarRegistro(user) ?? ((user.prescricoesAutorizadas ?? []).length > 0 ? <Badge tone="warning">Registro pendente</Badge> : '-')}</td>
              <td>{(user.prescricoesAutorizadas ?? []).length > 0 ? (user.prescricoesAutorizadas ?? []).map(id => tipoPrescricao(id).curto).join(', ') : (user.cargo === 'ADMIN' ? 'Todos os tipos' : '-')}</td>
              <td><Badge tone={user.ativo ? 'success' : 'neutral'}>{user.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
              <td>
                <span className="ux-acoes">
                  <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => openEdit(user)} aria-label={`Editar ${user.nome}`} title="Editar"><Pencil size={16} aria-hidden="true" /></button>
                  <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => void toggleActive(user)} disabled={updatingUserId !== null} aria-label={`${user.ativo ? 'Desativar' : 'Reativar'} ${user.nome}`} title={user.ativo ? 'Desativar' : 'Reativar'}>
                    {updatingUserId === user.id ? <LoaderCircle className="us-gira" size={16} aria-hidden="true" /> : user.ativo ? <UserRoundX size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                  </button>
                </span>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>)}
    {modal && <Modal title={editing ? 'Editar usuário' : 'Novo usuário'} icon="las la-user-edit" onClose={() => setModal(false)} busy={saving}>
      <form onSubmit={saveUser}>
        <div className="form-group">
          <label htmlFor="us-nome">Nome completo</label>
          <input id="us-nome" required maxLength={160} autoComplete="name" value={nome} onChange={event => setNome(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="us-email">E-mail</label>
          <input id="us-email" required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="us-cargo">Cargo</label>
          <select id="us-cargo" value={cargo} onChange={event => { const novo = event.target.value as Cargo; setCargo(novo); if (!editing) setPrescricoes(novo === 'MEDICO' ? [...SUGESTAO_POR_CARGO.MEDICO] : []) }}>{CARGOS.map(item => <option key={item} value={item}>{CARGO_LABEL[item]}</option>)}</select>
        </div>
        <CamposRegistro valor={registro} onChange={setRegistro} cargo={cargo} prefixo="us" obrigatorio={prescricoes.length > 0} />
        {podeReceberAutorizacao(cargo) && cargo !== 'ADMIN' && (
          <fieldset className="us-prescricao">
            <legend>Pode prescrever</legend>
            <p className="ux-secundario">Marque o que este profissional pode emitir nesta unidade. Quem prescreve precisa do registro no conselho preenchido acima. A instituição responde pela autorização.</p>
            {TIPOS_PRESCRICAO.map(tipo => (
              <label key={tipo.id} className="us-prescricao-item">
                <input type="checkbox" checked={prescricoes.includes(tipo.id)} onChange={e => setPrescricoes(atual => e.target.checked ? [...atual, tipo.id] : atual.filter(x => x !== tipo.id))} />
                <span>{tipo.rotulo}</span>
              </label>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPrescricoes([...(SUGESTAO_POR_CARGO[cargo] ?? [])])}>Usar sugestão para {rotuloCargo(cargo).toLowerCase()}</button>
          </fieldset>
        )}
        <div className="form-group">
          <label htmlFor="us-senha">Senha{editing && ' (deixe em branco para manter a atual)'}</label>
          <input id="us-senha" required={!editing} minLength={12} maxLength={72} type="password" autoComplete="new-password" aria-describedby="us-senha-dica" value={senha} onChange={event => setSenha(event.target.value)} />
          <span id="us-senha-dica" className="ux-secundario">Mínimo de 12 caracteres.</span>
        </div>
        {error && <p className="mod-aviso mod-aviso-erro" role="alert">{error}</p>}
        <div className="ui-modal-foot">
          <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <LoaderCircle className="us-gira" size={16} aria-hidden="true" />}{editing ? 'Salvar alterações' : 'Criar usuário'}</button>
        </div>
      </form>
    </Modal>}
  </main>
}
