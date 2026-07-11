'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './equipe-seguranca.css';

const equipeSegurancaData = [
  { nome: "Carlos Silva", cargo: "Supervisor de Segurança", setor: "Central", contato: "(85) 99999-0001", plantao: "Sim" },
  { nome: "Ana Oliveira", cargo: "Agente de Segurança", setor: "Emergência", contato: "(85) 99999-0002", plantao: "Sim" },
  { nome: "Pedro Santos", cargo: "Agente de Segurança", setor: "UTI/CC", contato: "(85) 99999-0003", plantao: "Sim" },
  { nome: "Marina Costa", cargo: "Brigadista", setor: "Geral", contato: "(85) 99999-0004", plantao: "Não" }
];

const setoresMonitorados = [
  { nome: "Emergência", icone: "las la-ambulance" },
  { nome: "UTI", icone: "las la-procedures" },
  { nome: "Centro Cirúrgico", icone: "las la-scalpel" },
  { nome: "Enfermaria", icone: "las la-bed" },
  { nome: "Recepção", icone: "las la-user-nurse" },
  { nome: "Farmácia", icone: "las la-prescription" }
];

const protocolosEmergencia = [
  { titulo: "🆘 Botão do Pânico", desc: "Acionamento imediato da equipe de segurança. Todos os agentes disponíveis devem se dirigir ao local.", tempo: "Imediato", equipe: "Todos os agentes" },
  { titulo: "💔 PCR - Parada Cardiorrespiratória", desc: "Acionar equipe médica de emergência. Iniciar RCP imediatamente. Buscar desfibrilador.", tempo: "Imediato", equipe: "Equipe médica + Segurança" },
  { titulo: "🔥 Incêndio", desc: "Acionar alarme de incêndio. Evacuar o setor. Acionar brigada de incêndio.", tempo: "Imediato", equipe: "Brigadistas + Segurança" },
  { titulo: "🚨 Invasão / Violência", desc: "Acionar segurança patrimonial. Isolar área. Contatar polícia se necessário.", tempo: "Imediato", equipe: "Segurança Patrimonial" },
  { titulo: "⚡ Queda de Energia", desc: "Verificar gerador. Acionar manutenção elétrica. Priorizar áreas críticas (UTI, CC).", tempo: "5 min", equipe: "Manutenção + Segurança" }
];

export default function EquipeSegurancaPage() {
  const { data: session } = useSession();
  const [alertas, setAlertas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [tabAtiva, setTabAtiva] = useState('alertas');
  const [alertaRecente, setAlertaRecente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [buscaAlerta, setBuscaAlerta] = useState('');
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [modalDetalhes, setModalDetalhes] = useState<any>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/equipe-seguranca');
      if (res.ok) {
        const ocorrencias = await res.json();
        const a = ocorrencias.filter((o: any) => !o.resolvido);
        const h = ocorrencias.filter((o: any) => o.resolvido);
        setAlertas(a);
        setHistorico(h);
        checkAlertasRecentes(a);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAlertasRecentes = (alertasAtuais: any[]) => {
    const agora = new Date();
    const recente = alertasAtuais.find(a => {
      const dAlerta = new Date(a.dataHora);
      if (isNaN(dAlerta.getTime())) return false;

      const diff = (agora.getTime() - dAlerta.getTime()) / 1000 / 60;
      return diff < 30 && !a.resolvido;
    });

    if (recente && (!alertaRecente || alertaRecente.id !== recente.id)) {
      setAlertaRecente(recente);
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gA=='); 
        audio.play().catch(() => {});
      } catch(e) {}
    } else if (!recente) {
      setAlertaRecente(null);
    }
  };

  const simularAlerta = async () => {
    const payload = {
      tipo: "BOTÃO DO PÂNICO",
      local: "Simulação de Teste",
      relato: "Simulação de botão do pânico",
      vigilante: "Sistema",
      dataHora: new Date().toISOString()
    };
    
    try {
      const res = await fetch('/api/equipe-seguranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao simular');
      alert("🚨 Alerta simulado gerado! Verifique o painel.");
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resolverAlerta = async (id: string) => {
    if (!confirm("Confirmar resolução deste alerta?")) return;
    
    const usuario = session?.user?.name || "Equipe de Segurança";
    const payload = {
      resolvido: true,
      resolvidoPor: usuario,
      dataResolucao: new Date().toISOString()
    };

    try {
      const res = await fetch(`/api/equipe-seguranca/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao resolver');
      alert("✅ Alerta resolvido com sucesso!");
      setModalDetalhes(null);
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Stats
  const hojeStr = new Date().toISOString().split('T')[0];
  const statTotal = alertas.length + historico.length;
  const statPanico = [...alertas, ...historico].filter(a => a.tipo === "BOTÃO DO PÂNICO").length;
  const statPCR = [...alertas, ...historico].filter(a => a.tipo === "ALERTA PCR").length;
  const statPendentes = alertas.length;
  const statResolvidos = historico.filter(a => a.dataResolucao && a.dataResolucao.startsWith(hojeStr)).length;

  // Filtros
  let alertasFiltrados = alertas.slice();
  if (buscaAlerta) {
    const term = buscaAlerta.toLowerCase();
    alertasFiltrados = alertasFiltrados.filter(a => a.local.toLowerCase().includes(term) || a.tipo.toLowerCase().includes(term));
  }

  let historicoFiltrado = historico.slice();
  if (buscaHistorico) {
    const term = buscaHistorico.toLowerCase();
    historicoFiltrado = historicoFiltrado.filter(a => (a.resolvidoPor && a.resolvidoPor.toLowerCase().includes(term)) || a.tipo.toLowerCase().includes(term));
  }

  const handlePrint = () => { window.print(); };

  if (loading && alertas.length === 0 && historico.length === 0) return <div>Carregando...</div>;

  return (
    <div className="conteudo">
      <div className="seg-container">

        <div className="banner-seg">
          <div>
            <h1><i className="las la-shield-alt"></i> Central de Segurança</h1>
            <p>Monitoramento de alertas, protocolos de emergência e equipe de pronta-resposta</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-warning" onClick={simularAlerta}><i className="las la-bell"></i> Simular Alerta</button>
            <button className="btn btn-info" onClick={handlePrint}><i className="las la-print"></i> Imprimir Relatório</button>
          </div>
        </div>

        <div className={`alerta-ativo-topo ${alertaRecente ? 'show' : ''}`}>
          {alertaRecente && (
            <>
              <i className="las la-exclamation-triangle"></i> 
              <span> 🚨 {alertaRecente.tipo} acionado em {alertaRecente.local} - {new Date(alertaRecente.dataHora).toLocaleTimeString()} - DIRIJA-SE AO LOCAL IMEDIATAMENTE!</span>
            </>
          )}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔔</div>
            <div className="stat-valor">{statTotal}</div>
            <div className="stat-label">Total de Alertas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🆘</div>
            <div className="stat-valor">{statPanico}</div>
            <div className="stat-label">Botões do Pânico</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💔</div>
            <div className="stat-valor">{statPCR}</div>
            <div className="stat-label">Alertas PCR</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-valor">{statResolvidos}</div>
            <div className="stat-label">Resolvidos Hoje</div>
          </div>
          <div className="stat-card critico">
            <div className="stat-icon">⚠️</div>
            <div className="stat-valor">{statPendentes}</div>
            <div className="stat-label">Pendentes</div>
          </div>
        </div>

        <div className="tabs-seg">
          <button className={`tab-btn ${tabAtiva === 'alertas' ? 'ativo' : ''}`} onClick={() => setTabAtiva('alertas')}><i className="las la-bell"></i> Alertas Ativos</button>
          <button className={`tab-btn ${tabAtiva === 'historico' ? 'ativo' : ''}`} onClick={() => setTabAtiva('historico')}><i className="las la-history"></i> Histórico</button>
          <button className={`tab-btn ${tabAtiva === 'mapa' ? 'ativo' : ''}`} onClick={() => setTabAtiva('mapa')}><i className="las la-map"></i> Mapa de Setores</button>
          <button className={`tab-btn ${tabAtiva === 'protocolos' ? 'ativo' : ''}`} onClick={() => setTabAtiva('protocolos')}><i className="las la-book"></i> Protocolos</button>
          <button className={`tab-btn ${tabAtiva === 'equipe' ? 'ativo' : ''}`} onClick={() => setTabAtiva('equipe')}><i className="las la-users"></i> Equipe</button>
        </div>

        {tabAtiva === 'alertas' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por local ou tipo..." value={buscaAlerta} onChange={e => setBuscaAlerta(e.target.value)} />
            </div>
            <div className="tabela-wrapper">
              <table className="tabela-seg">
                <thead>
                  <tr><th>Data/Hora</th><th>Tipo</th><th>Local</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {alertasFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#16a34a' }}>
                        <i className="las la-check-circle" style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}></i>
                        <strong>Nenhum alerta ativo! Ambiente seguro.</strong>
                      </td>
                    </tr>
                  ) : (
                    alertasFiltrados.map((a) => {
                      const badge = a.tipo === "BOTÃO DO PÂNICO" ? "badge-panico" : "badge-pcr";
                      return (
                        <tr key={a.id} className="critico">
                          <td><strong>{new Date(a.dataHora).toLocaleString('pt-BR')}</strong></td>
                          <td><span className={`badge ${badge}`}>{a.tipo}</span></td>
                          <td>{a.local}</td>
                          <td><span className="badge badge-danger">⚠️ Ativo</span></td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => resolverAlerta(a.id)}>
                              <i className="las la-check-circle"></i> Resolver
                            </button>
                            <button className="btn btn-info btn-sm" onClick={() => setModalDetalhes(a)}>
                              <i className="las la-eye"></i>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tabAtiva === 'historico' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar no histórico..." value={buscaHistorico} onChange={e => setBuscaHistorico(e.target.value)} />
            </div>
            <div className="tabela-wrapper">
              <table className="tabela-seg">
                <thead>
                  <tr><th>Data/Hora</th><th>Tipo</th><th>Local</th><th>Status</th><th>Resolvido por</th></tr>
                </thead>
                <tbody>
                  {historicoFiltrado.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum registro no histórico</td></tr>
                  ) : (
                    historicoFiltrado.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.dataHora).toLocaleString('pt-BR')}</td>
                        <td><span className="badge badge-info">{a.tipo}</span></td>
                        <td>{a.local}</td>
                        <td><span className="badge badge-success">✅ Resolvido</span></td>
                        <td>{a.resolvidoPor || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tabAtiva === 'mapa' && (
          <div className="mapa-container">
            <h3 style={{ marginBottom: '20px', color: '#0a1f44' }}><i className="las la-map-marked"></i> Monitoramento por Setor</h3>
            <div className="mapa-grid">
              {setoresMonitorados.map((s, i) => {
                const isAlerta = alertasFiltrados.some(a => a.tipo === "BOTÃO DO PÂNICO"); // fake alerta visual
                const status = (isAlerta && i === 0) ? 'alerta' : 'normal';
                
                return (
                  <div key={i} className={`mapa-setor ${status === 'alerta' ? 'alerta' : ''}`}>
                    <h4><i className={s.icone}></i> {s.nome}</h4>
                    <p><i className="las la-check-circle" style={{ color: status==='alerta'?'#dc2626':'#16a34a' }}></i> Status: {status === 'alerta' ? '⚠️ Em atenção' : '✅ Normal'}</p>
                    <p><i className="las la-user-shield"></i> Agente: {equipeSegurancaData.find(e => e.setor === s.nome || e.setor === 'Geral')?.nome || 'Não atribuído'}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tabAtiva === 'protocolos' && (
          <div>
            {protocolosEmergencia.map((p, i) => (
              <div key={i} className="protocolo-card">
                <h4>{p.titulo}</h4>
                <p>{p.desc}</p>
                <p style={{ marginTop: '10px' }}><i className="las la-clock"></i> <strong>Tempo:</strong> {p.tempo} &nbsp;|&nbsp; <i className="las la-users"></i> <strong>Equipe:</strong> {p.equipe}</p>
              </div>
            ))}
          </div>
        )}

        {tabAtiva === 'equipe' && (
          <div className="mapa-container">
            <h3 style={{ marginBottom: '20px', color: '#0a1f44' }}><i className="las la-users"></i> Equipe de Segurança de Plantão</h3>
            <div className="mapa-grid">
              {equipeSegurancaData.map((e, i) => (
                <div key={i} className={`mapa-setor ${e.plantao === 'Sim' ? '' : 'alerta'}`}>
                  <h4><i className="las la-user-shield"></i> {e.nome}</h4>
                  <p><i className="las la-briefcase"></i> {e.cargo}</p>
                  <p><i className="las la-map-marker"></i> Setor: {e.setor}</p>
                  <p><i className="las la-phone"></i> {e.contato}</p>
                  <p style={{ marginTop: '10px' }}>
                    <span className={`badge ${e.plantao === 'Sim' ? 'badge-success' : 'badge-warning'}`}>
                      {e.plantao === 'Sim' ? '🟢 De Plantão' : '⚫ Fora do Plantão'}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {modalDetalhes && (
        <div className="modal-detalhes" onClick={(e) => { if (e.target === e.currentTarget) setModalDetalhes(null); }}>
          <div className="modal-detalhes-content">
            <h3><i className="las la-exclamation-triangle" style={{ color: '#dc2626' }}></i> Detalhes do Alerta</h3>
            <p><strong>Tipo:</strong> <span className="badge badge-info">{modalDetalhes.tipo}</span></p>
            <p><strong>Local:</strong> {modalDetalhes.local}</p>
            <p><strong>Data/Hora:</strong> {new Date(modalDetalhes.dataHora).toLocaleString('pt-BR')}</p>
            <p><strong>Status:</strong> {modalDetalhes.resolvido ? <span className="badge badge-success">Resolvido</span> : <span className="badge badge-danger">⚠️ Ativo</span>}</p>
            {modalDetalhes.resolvidoPor && <p><strong>Resolvido por:</strong> {modalDetalhes.resolvidoPor}</p>}
            
            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
              {!modalDetalhes.resolvido && (
                <button className="btn btn-success" onClick={() => resolverAlerta(modalDetalhes.id)} style={{marginRight: '10px'}}>
                  <i className="las la-check"></i> Resolver Agora
                </button>
              )}
              <button className="btn btn-warning" onClick={() => setModalDetalhes(null)}>
                <i className="las la-times"></i> Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
