'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle2, Clock3, RefreshCw, Search, ShieldAlert } from 'lucide-react'
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

export default function EquipeSegurancaPage() {
  const { data: session } = useSession()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<'ativas' | 'historico'>('ativas')
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/equipe-seguranca', { cache: 'no-store' })
      if (!response.ok) throw new Error('Não foi possível carregar os registros.')
      const rows: unknown = await response.json()
      if (!Array.isArray(rows)) throw new Error('A resposta recebida é inválida.')
      setOcorrencias(rows.filter((row): row is Ocorrencia => {
        if (!row || typeof row !== 'object') return false
        const item = row as Ocorrencia
        const simulated = `${item.local ?? ''} ${item.relato ?? ''}`.toLowerCase().includes('simula')
        return !simulated
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar registros.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const ativas = useMemo(() => ocorrencias.filter(item => !item.resolvido), [ocorrencias])
  const historico = useMemo(() => ocorrencias.filter(item => item.resolvido), [ocorrencias])
  const lista = (filtro === 'ativas' ? ativas : historico).filter(item =>
    `${item.tipo} ${item.local} ${item.relato} ${item.resolvidoPor ?? ''}`.toLowerCase().includes(busca.toLowerCase()),
  )

  const resolver = async (id: string) => {
    const response = await fetch(`/api/equipe-seguranca/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolvido: true,
        resolvidoPor: session?.user?.name ?? 'Profissional autenticado',
        dataResolucao: new Date().toISOString(),
      }),
    })
    if (!response.ok) {
      setError('Não foi possível concluir este registro. Atualize e tente novamente.')
      return
    }
    await carregar()
  }

  return (
    <div className="conteudo">
      <div className="seg-container">
        <header className="banner-seg">
          <div>
            <h1><ShieldAlert aria-hidden="true" /> Registros de segurança</h1>
            <p>Consulte e encerre ocorrências registradas neste hospital.</p>
          </div>
          <button className="btn btn-info" type="button" onClick={() => void carregar()} disabled={loading}>
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

        <div className="tabs-seg" role="tablist" aria-label="Registros de segurança">
          <button className={`tab-btn ${filtro === 'ativas' ? 'ativo' : ''}`} type="button" role="tab" aria-selected={filtro === 'ativas'} onClick={() => setFiltro('ativas')}>
            <Clock3 size={16} aria-hidden="true" /> Ativas
          </button>
          <button className={`tab-btn ${filtro === 'historico' ? 'ativo' : ''}`} type="button" role="tab" aria-selected={filtro === 'historico'} onClick={() => setFiltro('historico')}>
            <CheckCircle2 size={16} aria-hidden="true" /> Encerradas
          </button>
        </div>

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
