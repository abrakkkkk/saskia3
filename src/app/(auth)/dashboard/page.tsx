'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { inter } from '@/app/fonts'
import EmergencyButtons from '@/components/EmergencyButtons'
import { ErrorState, LoadingState, type Tone } from '@/components/ui'
import { menuDoCargo } from '@/lib/navigation'
import './dashboard.css'

// Contadores que pedem ação agora ganham cartão; o resto vai numa linha compacta.
const PRIORITARIOS = ['contador_aguardando', 'contador_leitos_vermelha', 'contador_leitos_amarela', 'contador_leitos_uti']

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

// Cor de cada atalho, por área: azul assistência, verde apoio clínico, vermelho críticos,
// laranja operação, roxo gestão e conhecimento, cinza registros.
const TEMAS: Record<string, string> = {
  '/farmacia': 'green', '/servico-social': 'green', '/ccih': 'green',
  '/uti': 'red', '/centro-cirurgico': 'red', '/banco-sangue': 'red',
  '/transporte': 'orange', '/gestao-salas': 'orange', '/ponto': 'orange', '/feedback': 'orange', '/suporte': 'orange', '/lembretes': 'orange',
  '/admin': 'purple', '/admin-usuarios': 'purple', '/admin-configuracao': 'purple', '/admin-procedimentos': 'purple', '/admin-prontuarios': 'purple',
  '/admin-config-dashboard': 'purple', '/relatorios': 'purple', '/ouvidoria': 'purple', '/biblioteca': 'purple', '/vacinacao': 'purple', '/curvas-crescimento': 'purple',
  '/obitos': 'gray', '/manutencao': 'gray', '/utilitarios': 'gray', '/chamados-ti': 'gray', '/equipe-seguranca': 'gray',
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
  // Saudação e data só no navegador (hora local do plantão, sem divergir do servidor).
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => { const t = setTimeout(() => setAgora(new Date()), 0); return () => clearTimeout(t) }, [])
  const hora = agora?.getHours() ?? 12
  const saudacao = !agora ? 'Olá' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const hoje = agora ? agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

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

  // Rótulos curtos; a definição exata de cada contagem fica no tooltip.
  // Cor só onde significa algo: `alerta` pinta o número quando há o que fazer.
  type Kpi = { config: string; icone: string; tom: Tone; valor: string | number; rotulo: string; sub?: string; dica: string; alerta?: boolean }
  const kpis: Kpi[] = s ? [
    { config: 'contador_aguardando', icone: 'las la-hourglass-half', tom: 'warning', alerta: true, valor: valor(s.aguardando), rotulo: 'Aguardando', dica: 'Recepção, triagem e médico' },
    { config: 'contador_atendidos', icone: 'las la-user-md', tom: 'info', valor: valor(s.emAtendimento), rotulo: 'Em atendimento', dica: 'Triagem e consulta em curso' },
    { config: 'contador_total', icone: 'las la-procedures', tom: 'violet', valor: valor(s.internados), rotulo: 'Internados', dica: 'Enfermaria e UTI' },
    { config: 'contador_leitos_vermelha', icone: 'las la-exclamation-circle', tom: 'danger', alerta: true, valor: valor(s.riscoVermelho), rotulo: 'Risco vermelho', dica: 'Classificação de risco em curso (não é sala)' },
    { config: 'contador_leitos_amarela', icone: 'las la-exclamation-triangle', tom: 'yellow', alerta: true, valor: valor(s.riscoAmarelo), rotulo: 'Risco amarelo', dica: 'Classificação de risco em curso (não é sala)' },
    { config: 'contador_salas_cc', icone: 'las la-cut', tom: 'teal', valor: valor(s.cirurgiasEmAndamento), rotulo: 'Cirurgias', dica: 'Cirurgias em andamento agora' },
    { config: 'contador_leitos_uti', icone: 'las la-bed', tom: 'cyan', valor: statsErro && !stats ? '—' : `${s.leitosUti}/${s.totalLeitosUti}`, rotulo: 'Leitos UTI', dica: 'Leitos ocupados / cadastrados' },
    { config: 'contador_altas', icone: 'las la-check-circle', tom: 'success', valor: valor(s.altas), rotulo: 'Altas', dica: 'Registros ativos, sem período' },
    { config: 'contador_evasao', icone: 'las la-door-open', tom: 'rose', alerta: true, valor: valor(s.evasoes), rotulo: 'Evasões', dica: 'Registros ativos, sem período' },
    { config: 'contador_transferencias', icone: 'las la-truck', tom: 'neutral', valor: valor(s.transferencias), rotulo: 'Transferências', dica: 'Registros ativos, sem período' },
    { config: 'contador_obitos', icone: 'las la-cross', tom: 'neutral', valor: valor(s.obitos), rotulo: 'Óbitos', dica: 'Total registrado, sem período' },
  ] : []

  const distribuicao = s ? [
    ['Aguardando', s.aguardando], ['Em atendimento', s.emAtendimento], ['Internados', s.internados],
    ['Alta médica', s.altas], ['Transferido', s.transferencias], ['Evasão', s.evasoes],
  ] as [string, number][] : []
  const totalDistribuicao = distribuicao.reduce((soma, [, quantidade]) => soma + quantidade, 0)

  return (
    <div className={inter.className}>
      <h1 className="sr-only">Painel inicial</h1>
      <div className="painel-topo">
        <div>
          <h2>{saudacao}{usuario?.name ? `, ${usuario.name.split(' ')[0]}` : ''}</h2>
          <p>{usuario?.hospitalNome || 'Carregando...'} · {hoje}</p>
        </div>
        <EmergencyButtons />
      </div>

      {carregando && !s && <LoadingState message="Carregando indicadores..." />}
      {statsErro && <ErrorState message={statsErro} onRetry={() => void carregar()} />}

      {s && (
        <section aria-label="Indicadores do momento">
          <div className="painel-agora">
            <dl className="agora-principais">
              {kpis.filter(k => PRIORITARIOS.includes(k.config) && ativo(k.config)).map(k => {
                return (
                  <div key={k.config} title={k.dica} className={`agora-${k.tom}`}>
                    <dt><i className={k.icone} aria-hidden="true"></i> {k.rotulo}</dt>
                    <dd>{k.valor}</dd>
                  </div>
                )
              })}
            </dl>
            <dl className="agora-secundarios">
              {kpis.filter(k => !PRIORITARIOS.includes(k.config) && ativo(k.config)).map(k => (
                <div key={k.config} title={k.dica} className={`agora-${k.tom}`}><dt>{k.rotulo}</dt><dd>{k.valor}</dd></div>
              ))}
            </dl>
          </div>
          {atualizadoEm && <p className="kpi-atualizado">Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
        </section>
      )}

      {grupos.map(grupo => (
        <div key={grupo.titulo} className="categoria-section">
          <h3 className="section-title">{grupo.titulo}</h3>
          <div className="categorias">
            {grupo.itens.map(item => (
              <Link key={item.href} href={item.href}>
                <div className={`card-categoria theme-${TEMAS[item.href] ?? 'blue'}`}>
                  <div className="icon-wrapper" aria-hidden="true"><i className={item.icon}></i></div>
                  <h4>{item.label}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {s && (ativo('grafico_status') || ativo('grafico_resumo_mes')) && (
        <div className="graficos">
          {ativo('grafico_status') && <div className="card-grafico">
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
            }) : <p className="grafico-vazio">Nenhum paciente em atendimento agora.</p>}
          </div>}

          {ativo('grafico_resumo_mes') && (
            <div className="card-grafico">
              <h3><i className="las la-chart-line" aria-hidden="true"></i> Resumo assistencial</h3>
              <dl className="resumo-lista">
                <div>
                  <dt>Em fluxo</dt>
                  <dd>{valor(s.aguardando + s.emAtendimento)}</dd>
                  <p>Aguardando e em atendimento</p>
                </div>
                <div>
                  <dt>Desfechos</dt>
                  <dd>{valor(s.altas + s.transferencias)}</dd>
                  <p>Altas e transferências</p>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
