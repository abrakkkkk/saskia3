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
  
  const [buscaAlerta, setBuscaAlerta] = useState('');
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [modalDetalhes, setModalDetalhes] = useState<any>(null);

  const getHospitalId = () => {
    const u = localStorage.getItem('usuarioLogado');
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.hospitalId || 'hospital_001';
  };

  const loadData = () => {
    try {
      const hid = getHospitalId();
      const a = JSON.parse(localStorage.getItem(`${hid}_registroEmergencias`) || '[]');
      const h = JSON.parse(localStorage.getItem(`${hid}_alertasResolvidos`) || '[]');
      setAlertas(a);
      setHistorico(h);
      checkAlertasRecentes(a);
    } catch(e) {}
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
      // Formato: DD/MM/YYYY, HH:mm:ss ou YYYY-MM-DDTHH:mm:ss
      // Vamos tentar parsear a data
      let dataStr = a.dataHora;
      if (dataStr.includes('/')) {
        const [d, t] = dataStr.split(', ');
        if (d && t) {
          const [dia, mes, ano] = d.split('/');
          dataStr = `${ano}-${mes}-${dia}T${t}`;
        }
      }
      
      const dAlerta = new Date(dataStr);
      if (isNaN(dAlerta.getTime())) return false;

      const diff = (agora.getTime() - dAlerta.getTime()) / 1000 / 60;
      return diff < 30 && !a.resolvido;
    });

    if (recente && (!alertaRecente || alertaRecente.dataHora !== recente.dataHora)) {
      setAlertaRecente(recente);
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+Af39/gA=='); 
        audio.play().catch(() => {}); // catch in case browser blocks auto-play
      } catch(e) {}
    } else if (!recente) {
      setAlertaRecente(null);
    }
  };

  const simularAlerta = () => {
    const hid = getHospitalId();
    const novo = {
      tipo: "BOTÃO DO PÂNICO",
      profissional: "Simulação de Teste",
      dataHora: new Date().toLocaleString('pt-BR'),
      resolvido: false
    };
    const atualizados = [...alertas, novo];
    setAlertas(atualizados);
    localStorage.setItem(`${hid}_registroEmergencias`, JSON.stringify(atualizados));
    checkAlertasRecentes(atualizados);
    alert("🚨 Alerta simulado gerado! Verifique o painel.");
  };

  const resolverAlerta = (dataHora: string) => {
    if (!confirm("Confirmar resolução deste alerta?")) return;
    const hid = getHospitalId();
    
    const index = alertas.findIndex(a => a.dataHora === dataHora);
    if (index >= 0) {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = session?.user || (u ? JSON.parse(u) : null);
      
      const alerta = { ...alertas[index] };
      alerta.resolvido = true;
      alerta.resolvidoPor = usuario?.name || usuario?.nome || "Equipe de Segurança";
      alerta.dataResolucao = new Date().toLocaleString('pt-BR');
      
      const novosHistorico = [...historico, alerta];
      const novosAlertas = alertas.filter(a => a.dataHora !== dataHora);
      
      setAlertas(novosAlertas);
      setHistorico(novosHistorico);
      
      localStorage.setItem(`${hid}_registroEmergencias`, JSON.stringify(novosAlertas));
      localStorage.setItem(`${hid}_alertasResolvidos`, JSON.stringify(novosHistorico));
      
      checkAlertasRecentes(novosAlertas);
      alert("✅ Alerta resolvido com sucesso!");
    }
  };

  // Stats
  const hojeStr = new Date().toLocaleDateString('pt-BR');
  const statTotal = alertas.length;
  const statPanico = alertas.filter(a => a.tipo === "BOTÃO DO PÂNICO").length;
  const statPCR = alertas.filter(a => a.tipo === "ALERTA PCR").length;
  const statPendentes = alertas.filter(a => !a.resolvido).length;
  const statResolvidos = historico.filter(a => a.dataResolucao && a.dataResolucao.startsWith(hojeStr)).length;

  // Filtros
  let alertasFiltrados = alertas.filter(a => !a.resolvido).reverse();
  if (buscaAlerta) {
    const term = buscaAlerta.toLowerCase();
    alertasFiltrados = alertasFiltrados.filter(a => a.profissional.toLowerCase().includes(term) || a.tipo.toLowerCase().includes(term));
  }

  let historicoFiltrado = historico.slice().reverse();
  if (buscaHistorico) {
    const term = buscaHistorico.toLowerCase();
    historicoFiltrado = historicoFiltrado.filter(a => a.profissional.toLowerCase().includes(term) || a.tipo.toLowerCase().includes(term));
  }

  const handlePrint = () => { window.print(); };

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
              <span> 🚨 {alertaRecente.tipo} acionado por {alertaRecente.profissional} - {alertaRecente.dataHora} - DIRIJA-SE AO LOCAL IMEDIATAMENTE!</span>
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
              <input type="text" placeholder="Buscar por profissional ou tipo..." value={buscaAlerta} onChange={e => setBuscaAlerta(e.target.value)} />
            </div>
            <div className="tabela-wrapper">
              <table className="tabela-seg">
                <thead>
                  <tr><th>Data/Hora</th><th>Tipo</th><th>Profissional</th><th>Setor</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {alertasFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#16a34a' }}>
                        <i className="las la-check-circle" style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}></i>
                        <strong>Nenhum alerta ativo! Ambiente seguro.</strong>
                      </td>
                    </tr>
                  ) : (
                    alertasFiltrados.map((a, i) => {
                      const badge = a.tipo === "BOTÃO DO PÂNICO" ? "badge-panico" : "badge-pcr";
                      return (
                        <tr key={i} className="critico">
                          <td><strong>{a.dataHora}</strong></td>
                          <td><span className={`badge ${badge}`}>{a.tipo}</span></td>
                          <td>{a.profissional}</td>
                          <td>—</td>
                          <td><span className="badge badge-danger">⚠️ Ativo</span></td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => resolverAlerta(a.dataHora)}>
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
                  <tr><th>Data/Hora</th><th>Tipo</th><th>Profissional</th><th>Status</th><th>Resolvido por</th></tr>
                </thead>
                <tbody>
                  {historicoFiltrado.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum registro no histórico</td></tr>
                  ) : (
                    historicoFiltrado.map((a, i) => (
                      <tr key={i}>
                        <td>{a.dataHora}</td>
                        <td><span className="badge badge-info">{a.tipo}</span></td>
                        <td>{a.profissional}</td>
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
                // Simples logica estática ou dinâmica pra alertas de setor
                const isAlerta = alertasFiltrados.some(a => a.tipo === "BOTÃO DO PÂNICO"); // fake alerta visual
                const status = (isAlerta && i === 0) ? 'alerta' : 'normal'; // Apenas para ilustrar
                
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
            <p><strong>Profissional:</strong> {modalDetalhes.profissional}</p>
            <p><strong>Data/Hora:</strong> {modalDetalhes.dataHora}</p>
            <p><strong>Status:</strong> {modalDetalhes.resolvido ? <span className="badge badge-success">Resolvido</span> : <span className="badge badge-danger">⚠️ Ativo</span>}</p>
            {modalDetalhes.resolvidoPor && <p><strong>Resolvido por:</strong> {modalDetalhes.resolvidoPor}</p>}
            
            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
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
