'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './config-dashboard.css';



const modulosConfigOriginal = [
  { id: "card_pacientes", nome: "Card - Pacientes", desc: "Link rápido para Pacientes", icone: "las la-user-injured", secao: "Cards de Navegação", categoria: "cards_nav" },
  { id: "card_agenda", nome: "Card - Agenda", desc: "Link rápido para Agenda", icone: "las la-calendar", secao: "Cards de Navegação", categoria: "cards_nav" },
  { id: "card_receituario", nome: "Card - Receituário", desc: "Link rápido para Receituário", icone: "las la-file-prescription", secao: "Cards de Navegação", categoria: "cards_nav" },
  { id: "card_recepcao", nome: "Card - Recepção", desc: "Link rápido para Recepção", icone: "las la-user-nurse", secao: "Cards de Navegação", categoria: "cards_nav" },
  { id: "contador_atendidos", nome: "Contador - Pacientes Atendidos", desc: "Mostra total de atendidos", icone: "las la-users", secao: "Contadores", categoria: "contadores" },
  { id: "contador_aguardando", nome: "Contador - Aguardando", desc: "Mostra pacientes aguardando", icone: "las la-hourglass-half", secao: "Contadores", categoria: "contadores" },
  { id: "contador_leitos_vermelha", nome: "Contador - Sala Vermelha", desc: "Leitos da sala vermelha", icone: "las la-door-open", secao: "Contadores", categoria: "contadores" },
  { id: "contador_leitos_amarela", nome: "Contador - Sala Amarela", desc: "Leitos da sala amarela", icone: "las la-door-closed", secao: "Contadores", categoria: "contadores" },
  { id: "contador_salas_cc", nome: "Contador - Salas Cirúrgicas", desc: "Salas do centro cirúrgico", icone: "las la-scalpel", secao: "Contadores", categoria: "contadores" },
  { id: "contador_leitos_uti", nome: "Contador - Leitos UTI", desc: "Leitos de UTI ocupados", icone: "las la-procedures", secao: "Contadores", categoria: "contadores" },
  { id: "contador_altas", nome: "Contador - Altas", desc: "Total de altas", icone: "las la-check-circle", secao: "Contadores", categoria: "contadores" },
  { id: "contador_evasao", nome: "Contador - Evasão", desc: "Total de evasões", icone: "las la-exclamation-triangle", secao: "Contadores", categoria: "contadores" },
  { id: "contador_transferencias", nome: "Contador - Transferências", desc: "Total de transferências", icone: "las la-truck", secao: "Contadores", categoria: "contadores" },
  { id: "contador_media_idade", nome: "Contador - Média Etária", desc: "Média de idade dos pacientes", icone: "las la-chart-bar", secao: "Contadores", categoria: "contadores" },
  { id: "contador_total", nome: "Contador - Total Geral", desc: "Total de pacientes cadastrados", icone: "las la-file-alt", secao: "Contadores", categoria: "contadores" },
  { id: "contador_obitos", nome: "Contador - Óbitos", desc: "Total de óbitos registrados", icone: "las la-cross", secao: "Contadores", categoria: "contadores" },
  { id: "cat_biblioteca", nome: "Categoria - Biblioteca", desc: "Acesso à biblioteca", icone: "las la-book", secao: "Categorias", categoria: "categorias" },
  { id: "cat_fichas", nome: "Categoria - Fichas Auxiliares", desc: "Formulários e anexos", icone: "las la-clipboard-list", secao: "Categorias", categoria: "categorias" },
  { id: "cat_utilitarios", nome: "Categoria - Utilitários", desc: "Ferramentas diversas", icone: "las la-tools", secao: "Categorias", categoria: "categorias" },
  { id: "cat_institucional", nome: "Categoria - Institucional", desc: "Sobre a instituição", icone: "las la-building", secao: "Categorias", categoria: "categorias" },
  { id: "cat_sobre", nome: "Categoria - Sobre Nós", desc: "Nossa história", icone: "las la-heart", secao: "Categorias", categoria: "categorias" },
  { id: "cat_feedback", nome: "Categoria - Feedback", desc: "Envie sua opinião", icone: "las la-comment-dots", secao: "Categorias", categoria: "categorias" },
  { id: "cat_privacidade", nome: "Categoria - Privacidade", desc: "Proteção de dados", icone: "las la-shield-alt", secao: "Categorias", categoria: "categorias" },
  { id: "cat_usuarios", nome: "Categoria - Usuários", desc: "Gerenciar colaboradores", icone: "las la-users", secao: "Categorias", categoria: "categorias" },
  { id: "cat_farmacia", nome: "Categoria - Farmácia", desc: "Controle de medicamentos", icone: "las la-prescription", secao: "Categorias", categoria: "categorias" },
  { id: "cat_obitos", nome: "Categoria - Óbitos", desc: "Registro e controle", icone: "las la-cross", secao: "Categorias", categoria: "categorias" },
  { id: "cat_ponto", nome: "Categoria - Ponto", desc: "Entrada e saída", icone: "las la-clock", secao: "Categorias", categoria: "categorias" },
  { id: "cat_almoxarifado", nome: "Categoria - Almoxarifado", desc: "Controle de estoque", icone: "las la-boxes", secao: "Categorias", categoria: "categorias" },
  { id: "cat_centro_cirurgico", nome: "Categoria - Centro Cirúrgico", desc: "Agendamento e salas", icone: "las la-scalpel", secao: "Categorias", categoria: "categorias" },
  { id: "cat_uti", nome: "Categoria - UTI", desc: "Gestão de leitos", icone: "las la-procedures", secao: "Categorias", categoria: "categorias" },
  { id: "cat_exames", nome: "Categoria - Exames", desc: "Laboratório e Imagem", icone: "las la-flask", secao: "Categorias", categoria: "categorias" },
  { id: "cat_ccih", nome: "Categoria - CCIH", desc: "Controle de Infecção", icone: "las la-shield-virus", secao: "Categorias", categoria: "categorias" },
  { id: "cat_banco_sangue", nome: "Categoria - Banco de Sangue", desc: "Hemoterapia", icone: "las la-tint", secao: "Categorias", categoria: "categorias" },
  { id: "cat_cssd", nome: "Categoria - CSSD", desc: "Esterilização", icone: "las la-pump-soap", secao: "Categorias", categoria: "categorias" },
  { id: "cat_servico_social", nome: "Categoria - Serviço Social", desc: "Atendimento social", icone: "las la-hands-helping", secao: "Categorias", categoria: "categorias" },
  { id: "cat_manutencao", nome: "Categoria - Manutenção", desc: "Predial e equipamentos", icone: "las la-tools", secao: "Categorias", categoria: "categorias" },
  { id: "cat_transporte", nome: "Categoria - Transporte", desc: "Remoção de pacientes", icone: "las la-ambulance", secao: "Categorias", categoria: "categorias" },
  { id: "cat_ouvidoria", nome: "Categoria - Ouvidoria", desc: "Manifestações", icone: "las la-headset", secao: "Categorias", categoria: "categorias" },
  { id: "cat_chat", nome: "Categoria - Chat Interno", desc: "Comunicação profissional", icone: "las la-comments", secao: "Categorias", categoria: "categorias" },
  { id: "cat_relatorios", nome: "Categoria - Relatórios", desc: "Indicadores gerenciais", icone: "las la-chart-bar", secao: "Categorias", categoria: "categorias" },
  { id: "grafico_status", nome: "Gráfico - Distribuição por Status", desc: "Gráfico de barras de status", icone: "las la-chart-pie", secao: "Gráficos", categoria: "graficos" },
  { id: "grafico_resumo_mes", nome: "Gráfico - Resumo do Mês", desc: "Total de pacientes no mês", icone: "las la-chart-line", secao: "Gráficos", categoria: "graficos" },
  { id: "btn_panico", nome: "Botão do Pânico", desc: "Acionar emergência", icone: "las la-exclamation-triangle", secao: "Emergência", categoria: "emergencia" },
  { id: "btn_pcr", nome: "Botão PCR", desc: "Alerta de parada cardiorrespiratória", icone: "las la-heartbeat", secao: "Emergência", categoria: "emergencia" }
];

export default function AdminConfigDashboardPage() {
  const { data: session, status } = useSession();
  const [configLoading, setConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [configState, setConfigState] = useState<Record<string, boolean>>({});
  const [activeProfile, setActiveProfile] = useState<string>('');

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.cargo !== 'ADMIN') return;
    let cancelled = false;
    fetch('/api/config-dashboard', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Não foi possível carregar a configuração.');
        return response.json();
      })
      .then(stored => {
        let parsed: Record<string, boolean> = {};
        if (stored && Object.keys(stored).length > 0) {
          parsed = stored;
        } else {
          // Default: everything is active unless stored explicitly
          modulosConfigOriginal.forEach(m => { parsed[m.id] = true; });
        }
        
        // Ensure all current modules exist in config
        modulosConfigOriginal.forEach(m => {
          if (parsed[m.id] === undefined) parsed[m.id] = true;
        });

        if (!cancelled) setConfigState(parsed);
      })
      .catch(error => {
        if (!cancelled) {
          setConfigLoadError(true);
          setFeedback(error instanceof Error ? error.message : 'Erro ao carregar configuração.');
        }
      })
      .finally(() => { if (!cancelled) setConfigLoading(false); });
    return () => { cancelled = true; };
  }, [session, status]);

  const toggleModule = (id: string) => {
    setConfigState(prev => ({ ...prev, [id]: !prev[id] }));
    setActiveProfile(''); // Custom changed
  };

  const applyProfile = (perfil: string) => {
    setActiveProfile(perfil);
    
    const perfis: Record<string, { desativar: string[] }> = {
      hospital: { desativar: [] },
      clinica: { desativar: ["contador_leitos_vermelha","contador_leitos_amarela","contador_salas_cc","contador_leitos_uti","cat_centro_cirurgico","cat_uti","cat_ccih","cat_banco_sangue","cat_cssd","btn_panico","btn_pcr"] },
      consultorio: { desativar: ["card_recepcao","contador_leitos_vermelha","contador_leitos_amarela","contador_salas_cc","contador_leitos_uti","contador_altas","contador_evasao","contador_transferencias","contador_obitos","cat_biblioteca","cat_fichas","cat_utilitarios","cat_institucional","cat_farmacia","cat_obitos","cat_ponto","cat_almoxarifado","cat_centro_cirurgico","cat_uti","cat_exames","cat_ccih","cat_banco_sangue","cat_cssd","cat_servico_social","cat_manutencao","cat_transporte","cat_ouvidoria","cat_relatorios","btn_panico","btn_pcr","grafico_status"] },
      upa: { desativar: ["cat_biblioteca","cat_fichas","cat_ponto","cat_almoxarifado","cat_cssd","cat_servico_social","cat_manutencao","cat_transporte","cat_ouvidoria","cat_chat"] },
      todos: { desativar: [] },
      nenhum: { desativar: modulosConfigOriginal.map(m => m.id) }
    };

    const p = perfis[perfil];
    if (!p) return;

    const newState = { ...configState };
    
    if (perfil === 'todos') {
      modulosConfigOriginal.forEach(m => newState[m.id] = true);
    } else if (perfil === 'nenhum') {
      modulosConfigOriginal.forEach(m => newState[m.id] = false);
    } else {
      modulosConfigOriginal.forEach(m => {
        newState[m.id] = !p.desativar.includes(m.id);
      });
    }

    setConfigState(newState);
  };

  const saveConfig = async () => {
    setFeedback('');
    try {
      const response = await fetch('/api/config-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configState)
      });
      if (!response.ok) throw new Error('Não foi possível salvar a configuração.');
      setFeedback('Configuração salva. O dashboard será atualizado na próxima carga.');
    } catch {
      setFeedback('Erro ao salvar configuração.');
    }
  };

  const resetConfig = async () => {
    if(await confirm("Tem certeza que deseja restaurar todos os módulos para o padrão (ativados)?")) {
      const newState = { ...configState };
      modulosConfigOriginal.forEach(m => newState[m.id] = true);
      try {
        const response = await fetch('/api/config-dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newState)
        });
        if (!response.ok) throw new Error('Não foi possível restaurar a configuração.');
        setConfigState(newState);
        setActiveProfile('todos');
        setFeedback('Configuração restaurada para o padrão.');
      } catch {
        setFeedback('Erro ao restaurar configuração.');
      }
    }
  };

  const totalAtivos = Object.values(configState).filter(Boolean).length;
  if (status === 'loading') return <div className="conteudo">Carregando permissões…</div>;
  if (!session?.user) return <div className="conteudo">Entre no sistema para continuar.</div>;
  if (session.user.cargo !== 'ADMIN') return <div className="conteudo">Acesso restrito ao administrador do hospital.</div>;
  if (configLoading) return <div className="conteudo">Carregando configuração…</div>;
  if (configLoadError) return <div className="conteudo"><p className="config-feedback" role="alert">{feedback}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Tentar novamente</button></div>;

  // Agrupar seções
  const secoes: Record<string, typeof modulosConfigOriginal> = {};
  modulosConfigOriginal.forEach(m => {
    if (!secoes[m.secao]) secoes[m.secao] = [];
    secoes[m.secao].push(m);
  });

  return (
    <div className="conteudo">
      <div className="conf-container">
        
        <div className="banner-conf">
          <div>
            <h1><i className="las la-sliders-h"></i> Configurador do Dashboard</h1>
            <p>Personalize quais módulos e cards ficarão visíveis no sistema</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-warning" onClick={resetConfig}><i className="las la-undo"></i> Restaurar Padrão</button>
            <button className="btn btn-success" onClick={saveConfig}><i className="las la-save"></i> Salvar Configuração</button>
          </div>
        </div>

        <div className="alerta-restrito">
          <i className="las la-shield-alt icone"></i>
          <div>
            <strong><i className="las la-exclamation-triangle" aria-hidden="true"></i> Área de Configuração Avançada</strong>
            <p>Alterações aqui afetam diretamente a experiência do usuário final. Modifique com cuidado.</p>
          </div>
        </div>

        {feedback && <p className="config-feedback" role="status">{feedback}</p>}

        <div className="acoes-bar">
          <div>
            <strong style={{ color: '#0a1f44', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perfis Rápidos de Instalação:</strong>
            <div className="perfis-rapidos">
              <button className={`perfil-btn ${activeProfile === 'hospital' ? 'ativo' : ''}`} onClick={() => applyProfile('hospital')}>
                <i className="las la-hospital"></i> Hospital Completo
              </button>
              <button className={`perfil-btn ${activeProfile === 'clinica' ? 'ativo' : ''}`} onClick={() => applyProfile('clinica')}>
                <i className="las la-clinic-medical"></i> Clínica
              </button>
              <button className={`perfil-btn ${activeProfile === 'consultorio' ? 'ativo' : ''}`} onClick={() => applyProfile('consultorio')}>
                <i className="las la-user-md"></i> Consultório
              </button>
              <button className={`perfil-btn ${activeProfile === 'upa' ? 'ativo' : ''}`} onClick={() => applyProfile('upa')}>
                <i className="las la-ambulance"></i> UPA / Emergência
              </button>
              <button className={`perfil-btn ${activeProfile === 'todos' ? 'ativo' : ''}`} onClick={() => applyProfile('todos')}>
                <i className="las la-check-double"></i> Ativar Tudo
              </button>
              <button className={`perfil-btn ${activeProfile === 'nenhum' ? 'ativo' : ''}`} onClick={() => applyProfile('nenhum')}>
                <i className="las la-times-circle"></i> Desativar Tudo
              </button>
            </div>
          </div>
          <span className="info-text">
            <i className="las la-check-circle" style={{ color: '#16a34a', fontSize: '18px' }}></i> 
            {totalAtivos} de {modulosConfigOriginal.length} módulos ativos
          </span>
        </div>

        <div className="config-grid">
          {Object.entries(secoes).map(([secaoNome, modulos]) => {
            const ativosNaSecao = modulos.filter(m => configState[m.id]).length;
            
            return (
              <div className="config-section" key={secaoNome}>
                <h3>
                  <i className="las la-folder"></i> {secaoNome}
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto', background: '#f8fafc', padding: '4px 8px', borderRadius: '8px' }}>
                    {ativosNaSecao}/{modulos.length} ativos
                  </span>
                </h3>
                <div className="toggle-list">
                  {modulos.map(m => {
                    const isChecked = !!configState[m.id];
                    return (
                      <label className="toggle-item" key={m.id}>
                        <div className="toggle-info">
                          <i className={m.icone}></i>
                          <div>
                            <span className="toggle-name">{m.nome}</span>
                            <span className="toggle-desc">{m.desc}</span>
                          </div>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleModule(m.id)}
                          />
                          <span className="slider"></span>
                        </label>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
