'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import EmergencyButtons from '@/components/EmergencyButtons'

interface DashboardStats {
  pacientesAtendidos: number
  aguardando: number
  ocupadosVermelha: number
  ocupadosAmarela: number
  salasCirurgicas: number
  leitosUti: number
  altas: number
  evasoes: number
  transferencias: number
  mediaEtaria: number
  totalPacientes: number
  obitos: number
}

const NAV_CARDS = [
  { id: 'card_pacientes', href: '/pacientes', icon: 'las la-user-injured', title: 'Pacientes', desc: 'Gerenciar cadastros', theme: 'blue' },
  { id: 'card_agenda', href: '/agenda', icon: 'las la-calendar', title: 'Agenda', desc: 'Consultas e horários', theme: 'blue' },
  { id: 'card_receituario', href: '/receituario', icon: 'las la-file-prescription', title: 'Receituário', desc: 'Prescrições médicas', theme: 'blue' },
  { id: 'card_recepcao', href: '/recepcao', icon: 'las la-user-nurse', title: 'Recepção', desc: 'Atendimento inicial', theme: 'blue' }
]

const CATEGORY_GROUPS = [
  {
    title: 'Assistência e Clínica',
    items: [
      { id: 'cat_fichas', href: '/pacientes-busca', icon: 'las la-search', title: 'Buscar Pacientes', desc: 'Pesquisa avançada', theme: 'blue' },
      { id: 'cat_fichas', href: '/fichas-auxiliares', icon: 'las la-clipboard-list', title: 'Fichas Auxiliares', desc: 'Formulários e anexos', theme: 'blue' },
      { id: 'cat_exames', href: '/exames', icon: 'las la-flask', title: 'Exames', desc: 'Laboratório e Imagem', theme: 'blue' },
      { id: 'cat_farmacia', href: '/farmacia', icon: 'las la-prescription', title: 'Farmácia', desc: 'Controle de medicamentos', theme: 'green' },
      { id: 'cat_centro_cirurgico', href: '/centro-cirurgico', icon: 'las la-cut', title: 'Centro Cirúrgico', desc: 'Agendamento e salas', theme: 'red' },
      { id: 'cat_uti', href: '/uti', icon: 'las la-procedures', title: 'UTI', desc: 'Gestão de leitos', theme: 'red' },
      { id: 'cat_banco_sangue', href: '/banco-sangue', icon: 'las la-tint', title: 'Banco de Sangue', desc: 'Hemoterapia', theme: 'red' },
      { id: 'cat_obitos', href: '/obitos', icon: 'las la-cross', title: 'Óbitos', desc: 'Registro e controle', theme: 'gray' }
    ]
  },
  {
    title: 'Apoio Logístico e Operacional',
    items: [
      { id: 'cat_almoxarifado', href: '/almoxarifado', icon: 'las la-boxes', title: 'Almoxarifado', desc: 'Controle de estoque', theme: 'blue' },
      { id: 'cat_cssd', href: '/cssd', icon: 'las la-recycle', title: 'CSSD', desc: 'Esterilização', theme: 'blue' },
      { id: 'cat_manutencao', href: '/manutencao', icon: 'las la-tools', title: 'Manutenção', desc: 'Predial e equipamentos', theme: 'gray' },
      { id: 'cat_transporte', href: '/transporte', icon: 'las la-ambulance', title: 'Transporte', desc: 'Remoção de pacientes', theme: 'orange' },
      { id: 'cat_centro_cirurgico', href: '/gestao-salas', icon: 'las la-door-open', title: 'Gestão de Salas', desc: 'Reserva e controle', theme: 'orange' },
      { id: 'cat_servico_social', href: '/servico-social', icon: 'las la-hands-helping', title: 'Serviço Social', desc: 'Atendimento social', theme: 'green' },
      { id: 'cat_ccih', href: '/ccih', icon: 'las la-microscope', title: 'CCIH', desc: 'Controle de Infecção', theme: 'green' }
    ]
  },
  {
    title: 'Gestão e Administração',
    items: [
      { id: 'cat_usuarios', href: '/usuario', icon: 'las la-users', title: 'Usuários', desc: 'Gerenciar colaboradores', theme: 'purple' },
      { id: 'cat_ponto', href: '/ponto', icon: 'las la-clock', title: 'Ponto', desc: 'Entrada e saída', theme: 'orange' },
      { id: 'cat_relatorios', href: '/relatorios', icon: 'las la-chart-bar', title: 'Relatórios', desc: 'Indicadores gerenciais', theme: 'purple' },
      { id: 'cat_ouvidoria', href: '/ouvidoria', icon: 'las la-headset', title: 'Ouvidoria', desc: 'Manifestações', theme: 'purple' },
      { id: 'cat_chat', href: '/chat', icon: 'las la-comments', title: 'Chat Interno', desc: 'Comunicação profissional', theme: 'blue' }
    ]
  },
  {
    title: 'Institucional e Utilitários',
    items: [
      { id: 'cat_biblioteca', href: '/biblioteca', icon: 'las la-book', title: 'Biblioteca', desc: 'Documentação e materiais', theme: 'purple' },
      { id: 'cat_institucional', href: '/institucional', icon: 'las la-building', title: 'Institucional', desc: 'Sobre a instituição', theme: 'blue' },
      { id: 'cat_sobre', href: '/sobre-nos', icon: 'las la-heart', title: 'Sobre Nós', desc: 'Nossa história e missão', theme: 'pink' },
      { id: 'cat_feedback', href: '/feedback', icon: 'las la-comment-dots', title: 'Feedback', desc: 'Envie sua opinião', theme: 'orange' },
      { id: 'cat_privacidade', href: '/politicas-privacidade', icon: 'las la-shield-alt', title: 'Privacidade', desc: 'Proteção de dados', theme: 'gray' },
      { id: 'cat_utilitarios', href: '/utilitarios', icon: 'las la-tools', title: 'Utilitários', desc: 'Ferramentas diversas', theme: 'gray' }
    ]
  }
]

const STATUS_CORES: Record <string, string> = {
  'Aguardando': '#f59e0b', 'Em Atendimento': '#3b82f6', 'Finalizado': '#22c55e',
  'Retorno': '#a855f7', 'Internado': '#ec4899', 'Alta Médica': '#16a34a',
  'Óbito': '#64748b', 'Evasão': '#dc2626', 'Transferido': '#3b82f6'
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    pacientesAtendidos: 0, aguardando: 0, ocupadosVermelha: 0, ocupadosAmarela: 0,
    salasCirurgicas: 0, leitosUti: 0, altas: 0, evasoes: 0, transferencias: 0,
    mediaEtaria: 0, totalPacientes: 0, obitos: 0
  })

  const [dashboardConfig, setDashboardConfig] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(response => response.json())
      .then(setStats)
      .catch(() => {})

    try {
      const conf = localStorage.getItem('saskiaConfigDashboard')
      if (conf) {
        setDashboardConfig(JSON.parse(conf))
      }
    } catch(e) {}
  }, [])

  const isModuleActive = (id: string) => {
    if (Object.keys(dashboardConfig).length === 0) return true; // Default behavior
    return dashboardConfig[id] !== false;
  }

  const user = session?.user
  const cargoMap: Record<string, string> = {
    diretor_geral: 'Diretor Geral (CEO)',
    enfermeiro_assistencial: 'Enfermeiro Assistencial',
    medico_especialista: 'Médico Especialista'
  }
  const cargo = cargoMap[user?.cargo || ''] || user?.cargo || 'Profissional'

  const statusData = {
    'Aguardando': stats.aguardando,
    'Alta Médica': stats.altas,
    'Óbito': stats.obitos,
    'Evasão': stats.evasoes,
    'Transferido': stats.transferencias
  }

  const totalStatus = Object.values (statusData).reduce ((a, b) => a + b, 0)

  return (
    <div>
      <div className="perfil-profissional">
        <div className="perfil-info">
          <div className="perfil-avatar">
            <i className="las la-user-md"></i>
          </div>

          <div className="perfil-dados">
            <h3>{user?.name || 'Carregando...'}</h3>
            <p><i className="las la-hospital"></i> {user?.hospitalNome || '-'}</p>
          </div>
        </div>

        {(isModuleActive('btn_panico') || isModuleActive('btn_pcr')) && (
          <EmergencyButtons userName={user?.name || ''} />
        )}

        <div className="perfil-badge">
          <i className="las la-briefcase"></i> {cargo}
        </div>
      </div>

      <div className="cards-nav">
        {NAV_CARDS.filter(card => isModuleActive(card.id)).map ((card) => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div className={`card-nav theme-${card.theme}`}>
              <div className="icon-wrapper"><i className={card.icon}></i></div>
              <div className="nav-info">
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        
        {isModuleActive('contador_atendidos') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-users" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Pacientes Atendidos</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.pacientesAtendidos}</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_aguardando') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-hourglass-half" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Aguardando Atendimento</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.aguardando}</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_leitos_vermelha') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-door-open" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Leitos Sala Vermelha</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{stats.ocupadosVermelha}/7</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Capacidade: 7 leitos</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_leitos_amarela') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-door-closed" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Leitos Sala Amarela</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{stats.ocupadosAmarela}/20</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Capacidade: 20 leitos</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_salas_cc') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-procedures" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Salas Cirúrgicas</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{stats.salasCirurgicas}/4</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Capacidade: 4 salas</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_leitos_uti') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-bed" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Leitos UTI</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{stats.leitosUti}/10</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Capacidade: 10 leitos</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_altas') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-check-circle" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Altas</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.altas}</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_evasao') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-exclamation-triangle" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Evasão</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.evasoes}</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_transferencias') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-truck" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Transferências</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.transferencias}</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_media_idade') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-chart-bar" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Média Etária</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.mediaEtaria}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>anos</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_total') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-file-alt" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Resumo Geral</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.totalPacientes}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>pacientes cadastrados</div>
          </div>
        </div>
        )}

        {isModuleActive('contador_obitos') && (
        <div className="card-contador">
          <div className="contador-info" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ color: '#1e3a8a', marginBottom: '10px' }}><i className="las la-cross" style={{ fontSize: '24px' }}></i></div>
            <h3 style={{ fontSize: '13px', color: '#64748b' }}>Óbitos</h3>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{stats.obitos}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>registrados</div>
          </div>
        </div>
        )}
      </div>

      {CATEGORY_GROUPS.map ((group, idx) => {
        const activeItems = group.items.filter(cat => isModuleActive(cat.id));
        if (activeItems.length === 0) return null;

        return (
          <div key={idx} className="categoria-section">
            <h3 className="section-title">{group.title}</h3>
            <div className="categorias">
              {activeItems.map ((cat) => (
                <Link key={cat.href} href={cat.href} style={{ textDecoration: 'none' }}>
                  <div className={`card-categoria theme-${cat.theme}`}>
                    <div className="icon-wrapper"><i className={cat.icon}></i></div>
                    <div>
                      <h4>{cat.title}</h4>
                      <p>{cat.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      <div className="graficos">
        {isModuleActive('grafico_status') && (
        <div className="card-grafico">
          <h3><i className="las la-chart-pie"></i> Distribuição por Status</h3>

          {totalStatus > 0 ? (
            Object.entries (statusData).map (([status, qtd]) => {
              if (qtd === 0) return null
              const pct = Math.round ((qtd / totalStatus) * 100)
              return (
                <div className="barra-container" key={status}>
                  <div className="barra-label">
                    <span>{status}</span>
                    <span>{qtd} ({pct}%)</span>
                  </div>

                  <div className="barra">
                    <div
                      className="barra-preenchida"
                      style={{ width: `${pct}%`, background: STATUS_CORES[status] || '#1e3a8a' }}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
              Nenhum paciente cadastrado
            </p>
          )}
        </div>
        )}

        {isModuleActive('grafico_resumo_mes') && (
        <div className="card-grafico">
          <h3><i className="las la-chart-line"></i> Performance Hospitalar</h3>
          <div className="resumo-metricas">
            <div className="metrica-box">
              <div className="metrica-badge"><i className="las la-arrow-up"></i> +12% esse mês</div>
              <div className="valor">{stats.pacientesAtendidos + stats.aguardando}</div>
              <div className="label">Atendimentos Ativos</div>
            </div>
            <div className="metrica-box">
              <div className="metrica-badge" style={{ background: '#eff6ff', color: '#1e40af' }}>
                <i className="las la-check-double"></i> Concluídos
              </div>
              <div className="valor">{stats.altas + stats.transferencias}</div>
              <div className="label">Altas e Transferências</div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
