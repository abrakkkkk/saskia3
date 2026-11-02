'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { inter } from '@/app/fonts'
import { ErrorState, LoadingState, StatCard, StatGrid } from '@/components/ui'
import { menuDoCargo } from '@/lib/navigation'
import { CARGO_LABEL, type Cargo } from '@/lib/permissions'
import './dashboard.css'

interface DashboardStats {
  aguardando: number
  emAtendimento: number
  internados: number
  riscoVermelho: number
  riscoAmarelo: number
  cirurgiasEmAndamento: number
  leitosUti: number
  totalLeitosUti: number
  altas: number
  evasoes: number
  transferencias: number
  obitos: number
}

const CAMPOS: (keyof DashboardStats)[] = [
  'aguardando', 'emAtendimento', 'internados', 'riscoVermelho', 'riscoAmarelo', 'cirurgiasEmAndamento',
  'leitosUti', 'totalLeitosUti', 'altas', 'evasoes', 'transferencias', 'obitos',
]

// Cada atalho do menu pode ser ligado ou desligado em "Atalhos do dashboard" (admin-config-dashboard).
const ID_CONFIG: Record<string, string> = {
  '/pacientes': 'card_pacientes', '/agenda': 'card_agenda', '/receituario': 'card_receituario', '/recepcao': 'card_recepcao',
  '/pacientes-busca': 'cat_fichas', '/fichas-auxiliares': 'cat_fichas', '/exames': 'cat_exames', '/farmacia': 'cat_farmacia',
  '/centro-cirurgico': 'cat_centro_cirurgico', '/uti': 'cat_uti', '/banco-sangue': 'cat_banco_sangue', '/obitos': 'cat_obitos',
  '/almoxarifado': 'cat_almoxarifado', '/cssd': 'cat_cssd', '/manutencao': 'cat_manutencao', '/transporte': 'cat_transporte',
  '/servico-social': 'cat_servico_social', '/ccih': 'cat_ccih', '/admin-usuarios': 'cat_usuarios', '/ponto': 'cat_ponto',
  '/relatorios': 'cat_relatorios', '/ouvidoria': 'cat_ouvidoria', '/chat': 'cat_chat', '/biblioteca': 'cat_biblioteca',
  '/feedback': 'cat_feedback', '/utilitarios': 'cat_utilitarios',
}

const STATUS_CORES: Record<string, string> = {
  'Aguardando': '#b45309', 'Em atendimento': '#1d4ed8', 'Internados': '#be185d',
  'Alta médica': '#15803d', 'Transferido': '#0e7490', 'Evasão': '#b91c1c',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [statsErro, setStatsErro] = useState('')
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [dashboardConfig, setDashboardConfig] = useState<Record<string, boolean>>({})

  const carregar = useCallback(async (sinal?: AbortSignal) => {
    setCarregando(true)
    try {
      const resposta = await fetch('/api/dashboard/stats', { cache: 'no-store', signal: sinal })
      if (!resposta.ok) throw new Error('Não foi possível carregar os indicadores do hospital.')
      const dados: unknown = await resposta.json()
      const registro = dados as Record<string, unknown> | null
      if (!registro || CAMPOS.some(campo => typeof registro[campo] !== 'number' || !Number.isFinite(registro[campo]))) {
        throw new Error('A resposta dos indicadores está incompleta.')
      }
      setStats(registro as unknown as DashboardStats)
      setAtualizadoEm(new Date())
      setStatsErro('')
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'AbortError') return
      setStatsErro(erro instanceof Error ? erro.message : 'Erro ao carregar indicadores.')
    } finally {
      if (!sinal?.aborted) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const controle = new AbortController()
    void Promise.resolve().then(() => { carregar(controle.signal); });
    // Indicadores "agora": atualiza sozinho, mas só com a aba visível.
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar()
    }, 60_000)

    fetch('/api/config-dashboard', { signal: controle.signal })
      .then(resposta => (resposta.ok ? resposta.json() : null))
      .then((dados: unknown) => {
        if (dados && typeof dados === 'object' && !Array.isArray(dados)) setDashboardConfig(dados as Record<string, boolean>)
      })
      .catch(() => {})

    return () => { controle.abort(); window.clearInterval(intervalo) }
  }, [carregar])

  const ativo = (id: string) => dashboardConfig[id] !== false
  const usuario = session?.user
  const cargoRotulo = usuario?.cargo ? CARGO_LABEL[usuario.cargo as Cargo] ?? 'Profissional' : 'Profissional'

  const grupos = useMemo(() => menuDoCargo(usuario?.cargo)
    .filter(grupo => grupo.titulo !== 'Início')
    .map(grupo => ({
      ...grupo,
      itens: grupo.itens.filter(item => {
        const id = ID_CONFIG[item.href]
        return !id || ativo(id)
      }),
    }))
    .filter(grupo => grupo.itens.length > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [usuario?.cargo, dashboardConfig])

  const valor = (numero: number) => (statsErro && !stats ? '—' : numero)
  const s = stats

  const distribuicao = s ? [
    ['Aguardando', s.aguardando], ['Em atendimento', s.emAtendimento], ['Internados', s.internados],
    ['Alta médica', s.altas], ['Transferido', s.transferencias], ['Evasão', s.evasoes],
  ] as [string, number][] : []
  const totalDistribuicao = distribuicao.reduce((soma, [, quantidade]) => soma + quantidade, 0)

  return (
    <div className={inter.className}>
      <div className="perfil-profissional">
        <div className="perfil-info">
          <div className="perfil-avatar" aria-hidden="true"><i className="las la-user-md"></i></div>
          <div className="perfil-dados">
            <h3>{usuario?.name || 'Carregando...'}</h3>
            <p><i className="las la-hospital" aria-hidden="true"></i> {usuario?.hospitalNome || '-'}</p>
          </div>
        </div>
        <div className="perfil-badge"><i className="las la-briefcase" aria-hidden="true"></i> {cargoRotulo}</div>
      </div>

      {carregando && !s && <LoadingState message="Carregando indicadores..." />}
      {statsErro && <ErrorState message={statsErro} onRetry={() => void carregar()} />}

      {s && (
        <section aria-label="Indicadores do momento">
          <StatGrid>
            {ativo('contador_aguardando') && <StatCard icon="las la-hourglass-half" tone="warning" value={valor(s.aguardando)} label="Aguardando atendimento" hint="Recepção, triagem e médico" />}
            {ativo('contador_atendidos') && <StatCard icon="las la-user-md" tone="info" value={valor(s.emAtendimento)} label="Em atendimento" hint="Triagem e consulta em curso" />}
            {ativo('contador_total') && <StatCard icon="las la-procedures" tone="info" value={valor(s.internados)} label="Internados" hint="Enfermaria e UTI" />}
            {ativo('contador_leitos_vermelha') && <StatCard icon="las la-exclamation-circle" tone="danger" value={valor(s.riscoVermelho)} label="Risco vermelho em curso" hint="Classificação de risco, não é sala" />}
            {ativo('contador_leitos_amarela') && <StatCard icon="las la-exclamation-triangle" tone="warning" value={valor(s.riscoAmarelo)} label="Risco amarelo em curso" hint="Classificação de risco, não é sala" />}
            {ativo('contador_salas_cc') && <StatCard icon="las la-cut" tone="neutral" value={valor(s.cirurgiasEmAndamento)} label="Cirurgias em andamento" />}
            {ativo('contador_leitos_uti') && <StatCard icon="las la-bed" tone="neutral" value={statsErro && !stats ? '—' : `${s.leitosUti}/${s.totalLeitosUti}`} label="Leitos de UTI ocupados" hint="Ocupados / cadastrados" />}
            {ativo('contador_altas') && <StatCard icon="las la-check-circle" tone="success" value={valor(s.altas)} label="Altas" hint="Registros ativos, sem período" />}
            {ativo('contador_evasao') && <StatCard icon="las la-door-open" tone="danger" value={valor(s.evasoes)} label="Evasões" hint="Registros ativos, sem período" />}
            {ativo('contador_transferencias') && <StatCard icon="las la-truck" tone="neutral" value={valor(s.transferencias)} label="Transferências" hint="Registros ativos, sem período" />}
            {ativo('contador_obitos') && <StatCard icon="las la-cross" tone="neutral" value={valor(s.obitos)} label="Óbitos" hint="Total registrado, sem período" />}
          </StatGrid>
          {atualizadoEm && <p className="dashboard-atualizado" style={{ color: 'var(--ui-on-dark-muted)', fontSize: 13, margin: '-12px 0 20px' }}>Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Indicadores históricos e por período ficam em Relatórios.</p>}
        </section>
      )}

      {grupos.map(grupo => (
        <div key={grupo.titulo} className="categoria-section">
          <h3 className="section-title">{grupo.titulo}</h3>
          <div className="categorias">
            {grupo.itens.map(item => (
              <Link key={item.href} href={item.href}>
                <div className="card-categoria theme-blue">
                  <div className="icon-wrapper" aria-hidden="true"><i className={item.icon}></i></div>
                  <div><h4>{item.label}</h4></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {s && ativo('grafico_status') && (
        <div className="graficos">
          <div className="card-grafico">
            <h3><i className="las la-chart-pie" aria-hidden="true"></i> Distribuição por status</h3>
            {totalDistribuicao > 0 ? distribuicao.map(([nome, quantidade]) => {
              if (quantidade === 0) return null
              const pct = Math.round((quantidade / totalDistribuicao) * 100)
              return (
                <div className="barra-container" key={nome}>
                  <div className="barra-label"><span>{nome}</span><span>{quantidade} ({pct}%)</span></div>
                  <div className="barra"><div className="barra-preenchida" style={{ width: `${pct}%`, background: STATUS_CORES[nome] }} /></div>
                </div>
              )
            }) : <p style={{ textAlign: 'center', color: 'var(--ui-text-muted)', padding: 20 }}>Nenhum paciente nos status exibidos.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
