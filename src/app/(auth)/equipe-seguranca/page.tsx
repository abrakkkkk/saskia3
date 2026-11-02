'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tabs } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { CheckCircle2, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import './equipe-seguranca.css'

type Ocorrencia = {
  id: string
  tipo: string
  local: string
  relato: string
  vigilante: string
  dataHora: string
  resolvido: boolean
  resolvidoPor: string | null
  dataResolucao: string | null
}

const ABAS = [{ id: 'ativas', label: 'Ativas', icon: 'las la-clock' }, { id: 'historico', label: 'Encerradas', icon: 'las la-check-circle' }] as const

export default function EquipeSegurancaPage() {
  const { status: sessionStatus } = useSession()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<'ativas' | 'historico'>('ativas')
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState({ tipo: 'Ronda', local: '', relato: '' })
  const [registrando, setRegistrando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (sessionStatus === 'loading') return
      if (sessionStatus !== 'authenticated') {
        setOcorrencias([])
        setError('Entre na sua conta para consultar os registros de segurança.')
        return
      }
      const response = await fetch('/api/equipe-seguranca', { cache: 'no-store' })
      if (!response.ok) throw new Error('Não foi possível carregar os registros.')
      const rows: unknown = await response.json()
      if (!Array.isArray(rows)) throw new Error('A resposta recebida é inválida.')
      setOcorrencias(rows as Ocorrencia[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar registros.')
    } finally {
      setLoading(false)
    }
  }, [sessionStatus])

  useEffect(() => { void Promise.resolve().then(carregar) }, [carregar])

  const ativas = useMemo(() => ocorrencias.filter(item => !item.resolvido), [ocorrencias])
  const historico = useMemo(() => ocorrencias.filter(item => item.resolvido), [ocorrencias])
  const lista = (filtro === 'ativas' ? ativas : historico).filter(item =>
    `${item.tipo} ${item.local} ${item.relato} ${item.resolvidoPor ?? ''}`.toLowerCase().includes(busca.toLowerCase()),
  )

  const registrar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    if (registrando) return
    setRegistrando(true)
    setError('')
    try {
      const response = await fetch('/api/equipe-seguranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novo),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível registrar a ocorrência.')
      setNovo({ tipo: 'Ronda', local: '', relato: '' })
      await carregar()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a ocorrência.')
    } finally {
      setRegistrando(false)
    }
  }

  const resolver = async (id: string) => {
    setError('')
    try {
      const response = await fetch(`/api/equipe-seguranca/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvido: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Não foi possível concluir este registro. Atualize e tente novamente.')
        return
      }
      await carregar()
    } catch {
      setError('Não foi possível concluir este registro. Verifique sua conexão e tente novamente.')
    }
  }

  return (
    <div className="conteudo">
      <div className="seg-container">
        <header className="banner-seg">
          <div>
            <h1><ShieldAlert aria-hidden="true" /> Registros de segurança</h1>
            <p>Consulte e encerre ocorrências registradas neste hospital.</p>
          </div>
          <button className="btn btn-info" type="button" onClick={() => void carregar()} disabled={loading || sessionStatus !== 'authenticated'}>
            <RefreshCw size={16} aria-hidden="true" /> Atualizar
          </button>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><ShieldAlert aria-hidden="true" /></div>
            <div className="stat-valor">{ativas.length}</div>
            <div className="stat-label">Ocorrências ativas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><CheckCircle2 aria-hidden="true" /></div>
            <div className="stat-valor">{historico.length}</div>
            <div className="stat-label">Ocorrências encerradas</div>
          </div>
        </div>

        <div className="seg-flow-status" role="status">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>Acionamentos de emergência estão desativados até a aprovação do fluxo institucional.</span>
        </div>

        <form className="form-panel" onSubmit={registrar} aria-label="Registrar ocorrência">
          <h2>Registrar ocorrência</h2>
          <div className="form-grid">
            <div className="form-grupo">
              <label htmlFor="seg-tipo">Tipo</label>
              <select id="seg-tipo" value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value })}>
                <option>Ronda</option><option>Acesso indevido</option><option>Furto ou perda</option>
                <option>Conflito</option><option>Dano ao patrimônio</option><option>Outro</option>
              </select>
            </div>
            <div className="form-grupo">
              <label htmlFor="seg-local">Local</label>
              <input id="seg-local" required maxLength={160} value={novo.local} onChange={e => setNovo({ ...novo, local: e.target.value })} />
            </div>
            <div className="form-grupo full">
              <label htmlFor="seg-relato">Relato</label>
              <textarea id="seg-relato" required rows={3} maxLength={4000} value={novo.relato} onChange={e => setNovo({ ...novo, relato: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={registrando}>{registrando ? 'Registrando…' : 'Registrar ocorrência'}</button>
        </form>

        <Tabs label="Registros de segurança" tabs={ABAS} active={filtro} onChange={setFiltro} />

        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <input aria-label="Buscar ocorrências" type="search" placeholder="Buscar por tipo, local ou relato" value={busca} onChange={event => setBusca(event.target.value)} />
        </div>

        {error && <p role="alert" className="seg-error">{error}</p>}
        {loading ? <p role="status">Carregando registros…</p> : (
          <div className="tabela-wrapper">
            <table className="tabela-seg">
              <thead><tr><th>Data e hora</th><th>Tipo</th><th>Local</th><th>Relato</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr><td colSpan={6} className="seg-empty">Nenhuma ocorrência encontrada.</td></tr>
                ) : lista.map(item => (
                  <tr key={item.id}>
                    <td>{new Date(item.dataHora).toLocaleString('pt-BR')}</td>
                    <td>{item.tipo}</td>
                    <td>{item.local}</td>
                    <td>{item.relato}</td>
                    <td>{item.resolvido ? 'Encerrada' : 'Ativa'}</td>
                    <td>{!item.resolvido && <button className="btn btn-success btn-sm" type="button" onClick={() => void resolver(item.id)}>Encerrar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
