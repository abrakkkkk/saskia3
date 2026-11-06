'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, Panel, Badge, LoadingState, ErrorState } from '@/components/ui';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
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
];

export default function AdminConfigDashboardPage() {
  const { data: session, status } = useSession();
  const [configLoading, setConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [configState, setConfigState] = useState<Record<string, boolean>>({});
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

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
      clinica: { desativar: ["contador_leitos_vermelha","contador_leitos_amarela","contador_salas_cc","contador_leitos_uti","cat_centro_cirurgico","cat_uti","cat_ccih","cat_banco_sangue","cat_cssd"] },
      consultorio: { desativar: ["card_recepcao","contador_leitos_vermelha","contador_leitos_amarela","contador_salas_cc","contador_leitos_uti","contador_altas","contador_evasao","contador_transferencias","contador_obitos","cat_biblioteca","cat_fichas","cat_utilitarios","cat_institucional","cat_farmacia","cat_obitos","cat_ponto","cat_almoxarifado","cat_centro_cirurgico","cat_uti","cat_exames","cat_ccih","cat_banco_sangue","cat_cssd","cat_servico_social","cat_manutencao","cat_transporte","cat_ouvidoria","cat_relatorios","grafico_status"] },
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
    if (isSaving) return;
    setFeedback('');
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = async () => {
    if (isSaving) return;
    if(await confirm("Tem certeza que deseja restaurar todos os módulos para o padrão (ativados)?")) {
      const newState = { ...configState };
      modulosConfigOriginal.forEach(m => newState[m.id] = true);
      try {
        setIsSaving(true);
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
      } finally {
        setIsSaving(false);
      }
    }
  };

  const totalAtivos = Object.values(configState).filter(Boolean).length;
  if (status === 'loading') return <div className="mod-pagina"><PageHeader icon="las la-sliders-h" title="Dashboard" /><LoadingState message="Carregando permissões..." /></div>;
  if (!session?.user) return <div className="mod-pagina"><PageHeader icon="las la-sliders-h" title="Dashboard" /><div role="alert" className="mod-aviso mod-aviso-atencao">Entre no sistema para continuar.</div></div>;
  if (session.user.cargo !== 'ADMIN') return <div className="mod-pagina"><PageHeader icon="las la-sliders-h" title="Dashboard" /><div role="alert" className="mod-aviso mod-aviso-erro">Acesso restrito ao administrador do hospital.</div></div>;
  if (configLoading) return <div className="mod-pagina"><PageHeader icon="las la-sliders-h" title="Dashboard" /><LoadingState message="Carregando configuração..." /></div>;
  if (configLoadError) return <div className="mod-pagina"><PageHeader icon="las la-sliders-h" title="Dashboard" /><ErrorState message={feedback || 'Não foi possível carregar a configuração.'} onRetry={() => window.location.reload()} /></div>;

  // Agrupar seções
  const secoes: Record<string, typeof modulosConfigOriginal> = {};
  modulosConfigOriginal.forEach(m => {
    if (!secoes[m.secao]) secoes[m.secao] = [];
    secoes[m.secao].push(m);
  });

  const perfis = [
    { id: 'hospital', icone: 'las la-hospital', rotulo: 'Hospital completo' },
    { id: 'clinica', icone: 'las la-clinic-medical', rotulo: 'Clínica' },
    { id: 'consultorio', icone: 'las la-user-md', rotulo: 'Consultório' },
    { id: 'upa', icone: 'las la-ambulance', rotulo: 'UPA / Emergência' },
    { id: 'todos', icone: 'las la-check-double', rotulo: 'Ativar tudo' },
  ];

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-sliders-h"
        title="Dashboard"
        subtitle="Escolha os indicadores, atalhos e gráficos exibidos. O menu lateral não muda."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={resetConfig} disabled={isSaving}><i className="las la-undo" aria-hidden="true"></i> Restaurar padrão</button>
            <button type="button" className="btn btn-primary" onClick={saveConfig} disabled={isSaving}><i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Salvando…' : 'Salvar'}</button>
          </>
        }
      />

      <p className="mod-aviso mod-aviso-atencao"><i className="las la-exclamation-triangle" aria-hidden="true"></i> Estas alterações afetam todos os usuários do hospital.</p>

      {feedback && <p className={`mod-aviso ${feedback.startsWith('Erro') || feedback.startsWith('Não foi') ? 'mod-aviso-erro' : 'mod-aviso-sucesso'}`} role="status" aria-live="polite">{feedback}</p>}

      <Panel title="Perfis rápidos" icon="las la-magic" actions={<Badge tone="info">{totalAtivos} de {modulosConfigOriginal.length} ativos</Badge>}>
        <div className="ux-chips">
          {perfis.map(p => (
            <button key={p.id} type="button" aria-pressed={activeProfile === p.id} className="ux-chip" onClick={() => applyProfile(p.id)}>
              <i className={p.icone} aria-hidden="true"></i> {p.rotulo}
            </button>
          ))}
          <button type="button" aria-pressed={activeProfile === 'nenhum'} className="ux-chip" onClick={async () => { if (await confirm('Desativar todos os itens do dashboard? Nada será gravado até você salvar.')) applyProfile('nenhum'); }}>
            <i className="las la-times-circle" aria-hidden="true"></i> Desativar tudo
          </button>
        </div>
      </Panel>

      <div className="cfg-grid">
        {Object.entries(secoes).map(([secaoNome, modulos]) => {
          const ativosNaSecao = modulos.filter(m => configState[m.id]).length;
          return (
            <Panel key={secaoNome} title={secaoNome} icon="las la-folder" actions={<Badge>{ativosNaSecao}/{modulos.length} ativos</Badge>}>
              <ul className="ux-lista cfg-lista">
                {modulos.map(m => (
                  <li key={m.id}>
                    <label className="cfg-item">
                      <i className={m.icone} aria-hidden="true"></i>
                      <span className="cfg-texto">
                        <strong>{m.nome}</strong>
                        <small>{m.desc}</small>
                      </span>
                      <span className="ux-switch">
                        <input
                          type="checkbox"
                          checked={!!configState[m.id]}
                          aria-label={`Ativar ${m.nome}`}
                          disabled={isSaving}
                          onChange={() => toggleModule(m.id)}
                        />
                        <span className="ux-switch-trilho" aria-hidden="true"></span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
