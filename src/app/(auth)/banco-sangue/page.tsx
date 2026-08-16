'use client';
import { useState, useEffect } from 'react';
import './banco-sangue.css';

// --- Interfaces ---
interface Bolsa { id: number; tipo: string; componente: string; numero: string; volume: number; coleta: string; validade: string; origem: string; sorologias: string; status: string; dataTransfusao?: string; pacienteTransfusao?: string; }
interface Transfusao { id: number; paciente: string; tipoPaciente: string; bolsaId: number; data: string; medico: string; enfermeiro: string; }
interface LogEntrada { id: number; data: string; tipo: string; componente: string; numero: string; origem: string; }
interface Solicitacao { id: number; tipo: string; quantidade: number; data: string; status: string; }

export default function BancoSanguePage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('estoque');

  // --- Estados ---
  const [bolsas, setBolsas] = useState<Bolsa[]>([]);
  const [transfusoes, setTransfusoes] = useState<Transfusao[]>([]);
  const [logEntradas, setLogEntradas] = useState<LogEntrada[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);

  // Filtros Estoque
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');

  // Pacientes mock
  const [pacientesMock] = useState(['João Silva', 'Maria Souza', 'José Pereira', 'Ana Costa', 'Carlos Mendes']);

  useEffect(() => {
    setMounted(true);
    const loadState = (key: string, defaultData: any) => {
      const saved = localStorage.getItem(key);
      if (saved) { try { return JSON.parse(saved); } catch(e) { return defaultData; } }
      return defaultData;
    };

    const initialBolsas = [
      { id: 1, tipo: "O-", componente: "CH", numero: "CH-001-O-", volume: 300, coleta: "2026-04-15", validade: "2026-06-15", origem: "HEMOCE", sorologias: "Liberado", status: "Disponível" },
      { id: 2, tipo: "A+", componente: "CH", numero: "CH-002-A+", volume: 300, coleta: "2026-04-20", validade: "2026-06-20", origem: "HEMOCE", sorologias: "Liberado", status: "Disponível" },
      { id: 3, tipo: "O+", componente: "PFC", numero: "PFC-001-O+", volume: 250, coleta: "2026-03-01", validade: "2026-06-01", origem: "HEMOCE", sorologias: "Liberado", status: "Disponível" },
      { id: 4, tipo: "AB+", componente: "CP", numero: "CP-001-AB+", volume: 50, coleta: "2026-05-01", validade: new Date(Date.now() + 86400000*3).toISOString().split('T')[0], origem: "Doador", sorologias: "Liberado", status: "Disponível" }
    ];

    setBolsas(loadState('saskiaBsBolsas', initialBolsas));
    setTransfusoes(loadState('saskiaBsTransfusoes', []));
    setLogEntradas(loadState('saskiaBsEntradas', []));
    setSolicitacoes(loadState('saskiaBsSolicitacoes', []));
  }, []);

  const saveState = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

  if (!mounted) return null;

  // --- Utils ---
  const getIcone = (c: string) => { if(c.includes('CH')) return '🩸'; if(c.includes('PFC')) return '💧'; if(c.includes('CP')) return '🟡'; return '🩸'; };
  const getAbrev = (c: string) => { if(c.includes('CH')) return 'CH'; if(c.includes('PFC')) return 'PFC'; if(c.includes('CP')) return 'CP'; return c; };

  // --- Indicadores ---
  const disponiveis = bolsas.filter(b => b.status === 'Disponível');
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const vencendo = bolsas.filter(b => {
    if (b.status !== 'Disponível') return false;
    const v = new Date(b.validade + 'T00:00:00');
    const diff = Math.floor((v.getTime() - hoje.getTime()) / 86400000);
    return diff <= 7 && diff >= 0;
  });
  const pendentes = bolsas.filter(b => b.status === 'Pendente');
  const oNegativo = disponiveis.filter(b => b.tipo === 'O-');
  const transfMes = transfusoes.filter(t => new Date(t.data).getMonth() === hoje.getMonth()).length;
  const taxaUso = bolsas.length > 0 ? Math.round((bolsas.filter(b => b.status === 'Transfundida').length / bolsas.length) * 100) : 0;

  // --- Lógica Estoque ---
  let estoqueFiltrado = [...bolsas];
  if (filtroStatus !== 'todas') estoqueFiltrado = estoqueFiltrado.filter(b => b.status === filtroStatus);
  if (buscaEstoque.trim()) {
    const termo = buscaEstoque.toLowerCase();
    if (termo === 'vencidas') {
      estoqueFiltrado = vencendo;
    } else {
      estoqueFiltrado = estoqueFiltrado.filter(b => b.tipo.toLowerCase().includes(termo) || b.componente.toLowerCase().includes(termo));
    }
  }

  const gruposEstoque = estoqueFiltrado.reduce((acc, b) => {
    const key = `${b.tipo}|${b.componente}`;
    if (!acc[key]) acc[key] = { tipo: b.tipo, componente: b.componente, abrev: getAbrev(b.componente), icone: getIcone(b.componente), bolsas: [] };
    acc[key].bolsas.push(b);
    return acc;
  }, {} as Record<string, { tipo: string, componente: string, abrev: string, icone: string, bolsas: Bolsa[] }>);

  // --- Ações ---
  const formEntrada = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const numero = fd.get('numero') as string;
    
    if (bolsas.some(b => b.numero === numero)) { alert('⚠️ Bolsa já existe no sistema!'); return; }
    
    const nova: Bolsa = {
      id: Date.now(),
      tipo: fd.get('tipo') as string,
      componente: fd.get('componente') as string,
      numero: numero,
      volume: Number(fd.get('volume')),
      coleta: fd.get('coleta') as string,
      validade: fd.get('validade') as string,
      origem: fd.get('origem') as string,
      sorologias: fd.get('sorologias') as string,
      status: fd.get('sorologias') === 'Bloqueada' ? 'Bloqueada' : (fd.get('sorologias') === 'Pendente' ? 'Pendente' : 'Disponível')
    };

    const newBolsas = [nova, ...bolsas]; setBolsas(newBolsas); saveState('saskiaBsBolsas', newBolsas);
    const newLog: LogEntrada = { id: Date.now(), data: new Date().toISOString(), tipo: nova.tipo, componente: nova.componente, numero: nova.numero, origem: nova.origem };
    const newEntradas = [newLog, ...logEntradas]; setLogEntradas(newEntradas); saveState('saskiaBsEntradas', newEntradas);
    
    (e.target as HTMLFormElement).reset(); alert('✅ Bolsa registrada no estoque!');
  };

  const formTransfusao = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const bolsaId = Number(fd.get('bolsaId'));
    const bolsa = bolsas.find(b => b.id === bolsaId);
    
    if (!bolsa || bolsa.status !== 'Disponível') { alert('⚠️ Bolsa não encontrada ou indisponível!'); return; }

    const novaT: Transfusao = {
      id: Date.now(), paciente: fd.get('paciente') as string, tipoPaciente: fd.get('tipoPaciente') as string,
      bolsaId: bolsaId, data: fd.get('data') as string, medico: fd.get('medico') as string, enfermeiro: fd.get('enfermeiro') as string
    };

    const newTransf = [novaT, ...transfusoes]; setTransfusoes(newTransf); saveState('saskiaBsTransfusoes', newTransf);
    const newBolsas = bolsas.map(b => b.id === bolsaId ? { ...b, status: 'Transfundida', dataTransfusao: novaT.data, pacienteTransfusao: novaT.paciente } : b);
    setBolsas(newBolsas); saveState('saskiaBsBolsas', newBolsas);

    (e.target as HTMLFormElement).reset(); alert('✅ Transfusão registrada com sucesso!');
  };

  const formSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const novaS: Solicitacao = { id: Date.now(), tipo: fd.get('tipo') as string, quantidade: Number(fd.get('qtd')), data: new Date().toISOString(), status: 'Solicitado' };
    const newSol = [novaS, ...solicitacoes]; setSolicitacoes(newSol); saveState('saskiaBsSolicitacoes', newSol);
    (e.target as HTMLFormElement).reset(); alert('✅ Solicitação enviada ao Hemocentro!');
  };

  return (
    <div className="conteudo">
      <div className="bs-container">
        
        <div className="banner-bs" style={{ background: 'linear-gradient(135deg,#7c0101,#dc2626)', borderRadius: '8px', padding: '30px 40px', color: 'white', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '28px', margin: 0 }}><i className="las la-tint"></i> Banco de Sangue e Hemoterapia</h1>
            <p style={{ marginTop: '10px' }}>Gestão de hemocomponentes, transfusões, compatibilidade e rastreabilidade total</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-success" onClick={() => setActiveTab('entrada')}><i className="las la-plus-circle"></i> Entrada de Bolsa</button>
            <button className="btn btn-warning" onClick={() => setActiveTab('transfusao')}><i className="las la-syringe"></i> Transfusão</button>
          </div>
        </div>

        {/* --- INDICADORES --- */}
        <div className="indicadores-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div className="ind-card alert" onClick={() => {setActiveTab('estoque'); setFiltroStatus('todas'); setBuscaEstoque('');}}>
            <div className="card-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626', width: '58px', height: '58px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><i className="las la-tint"></i></div>
            <div className="card-info"><div className="ind-valor" style={{ fontSize: '32px', fontWeight: 800, color: '#0a1f44' }}>{bolsas.length}</div><div className="ind-label" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Total de Bolsas</div></div>
          </div>
          <div className="ind-card" onClick={() => {setActiveTab('estoque'); setFiltroStatus('Disponível'); setBuscaEstoque('');}}>
            <div className="card-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a', width: '58px', height: '58px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><i className="las la-check-circle"></i></div>
            <div className="card-info"><div className="ind-valor" style={{ fontSize: '32px', fontWeight: 800, color: '#0a1f44' }}>{disponiveis.length}</div><div className="ind-label" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Disponíveis</div></div>
          </div>
          <div className="ind-card critico" onClick={() => {setActiveTab('estoque'); setBuscaEstoque('vencidas'); setFiltroStatus('todas');}}>
            <div className="card-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626', width: '58px', height: '58px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><i className="las la-exclamation-triangle"></i></div>
            <div className="card-info"><div className="ind-valor" style={{ fontSize: '32px', fontWeight: 800, color: '#dc2626' }}>{vencendo.length}</div><div className="ind-label" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>⚠️ Vence em 7 dias</div></div>
          </div>
          <div className="ind-card" onClick={() => setActiveTab('historico')}>
            <div className="card-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb', width: '58px', height: '58px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><i className="las la-syringe"></i></div>
            <div className="card-info"><div className="ind-valor" style={{ fontSize: '32px', fontWeight: 800, color: '#0a1f44' }}>{transfMes}</div><div className="ind-label" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Transfusões (Mês)</div></div>
          </div>
          <div className="ind-card critico" onClick={() => {setActiveTab('estoque'); setBuscaEstoque('O-'); setFiltroStatus('Disponível');}}>
            <div className="card-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626', width: '58px', height: '58px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><i className="las la-tint"></i></div>
            <div className="card-info"><div className="ind-valor" style={{ fontSize: '32px', fontWeight: 800, color: '#dc2626' }}>{oNegativo.length}</div><div className="ind-label" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>O- (Emergência)</div></div>
          </div>
          <div className="ind-card" onClick={() => {setActiveTab('estoque'); setFiltroStatus('Pendente'); setBuscaEstoque('');}}>
            <div className="card-icon-wrap" style={{ background: '#fffbeb', color: '#d97706', width: '58px', height: '58px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}><i className="las la-clock"></i></div>
            <div className="card-info"><div className="ind-valor" style={{ fontSize: '32px', fontWeight: 800, color: '#0a1f44' }}>{pendentes.length}</div><div className="ind-label" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>⏳ Pendentes</div></div>
          </div>
        </div>

        {/* --- TABS MENU --- */}
        <div className="tabs-bs" style={{ display: 'flex', gap: '6px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
          {[
            { id: 'estoque', icon: 'la-boxes', label: 'Estoque Mestre' },
            { id: 'entrada', icon: 'la-plus-circle', label: 'Entrada de Bolsa' },
            { id: 'transfusao', icon: 'la-syringe', label: 'Transfusão' },
            { id: 'historico', icon: 'la-history', label: 'Histórico' },
            { id: 'compatibilidade', icon: 'la-project-diagram', label: 'Compatibilidade' },
            { id: 'solicitacoes', icon: 'la-ambulance', label: 'Solicitações Hemocentro' }
          ].map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'ativo' : ''}`} onClick={() => setActiveTab(t.id)} style={{ padding: '14px 28px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: activeTab === t.id ? '#dc2626' : '#64748b', borderBottom: `3px solid ${activeTab === t.id ? '#dc2626' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className={`las ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* --- ABA ESTOQUE --- */}
        {activeTab === 'estoque' && (
          <div className="animate-in fade-in duration-300">
            <div className="search-box" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" placeholder="Filtrar por tipo (ex: O-) ou componente..." value={buscaEstoque} onChange={e => setBuscaEstoque(e.target.value)} style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', flex: 1 }} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px' }}>
                <option value="todas">Todas as Situações</option>
                <option value="Disponível">✅ Disponíveis</option>
                <option value="Transfundida">💉 Transfundidas</option>
                <option value="Bloqueada">🚫 Bloqueadas</option>
                <option value="Pendente">⏳ Pendentes</option>
              </select>
            </div>

            <div className="estoque-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '18px' }}>
              {Object.keys(gruposEstoque).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', gridColumn: '1/-1', color: '#94a3b8' }}>Nenhuma bolsa encontrada no filtro atual.</div>
              ) : (
                Object.values(gruposEstoque).sort((a,b) => a.tipo.localeCompare(b.tipo)).map((g, i) => {
                  const qtd = g.bolsas.length;
                  const cor = qtd <= 2 ? '#dc2626' : (qtd <= 5 ? '#f59e0b' : '#16a34a');
                  return (
                    <div key={i} className="estoque-card" style={{ background: 'white', borderRadius: '8px', padding: '25px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', position: 'relative', borderTop: `5px solid ${cor}` }}
                      onClick={() => alert(`Detalhes (${g.tipo} ${g.abrev}):\n` + g.bolsas.map(b => `- ${b.numero} | ${b.status} | Val: ${new Date(b.validade).toLocaleDateString()}`).join('\n'))}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{g.icone}</div>
                      <div style={{ fontWeight: 700, color: '#0a1f44', fontSize: '18px', marginBottom: '2px' }}>{g.tipo}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>{g.abrev}</div>
                      <div style={{ fontSize: '48px', fontWeight: 800, margin: '10px 0', color: cor }}>{qtd}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                        <span style={{ display: 'inline-block', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Clique para ver as {qtd} bolsas</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- ABA ENTRADA --- */}
        {activeTab === 'entrada' && (
          <div className="animate-in fade-in duration-300">
            <div className="form-panel" style={{ background: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', marginBottom: '25px' }}>
              <h3 style={{ color: '#0a1f44', marginBottom: '22px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-plus-circle"></i> Registrar Entrada de Nova Bolsa</h3>
              <form onSubmit={formEntrada} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Tipo Sanguíneo *</label><select name="tipo" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}><option value="">Selecione...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Hemocomponente *</label><select name="componente" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}><option value="CH">Concentrado de Hemácias (CH)</option><option value="PFC">Plasma Fresco Congelado (PFC)</option><option value="CP">Concentrado de Plaquetas (CP)</option><option value="Crioprecipitado">Crioprecipitado</option></select></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Nº Único da Bolsa *</label><input name="numero" required placeholder="Ex: CH-001" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Volume (ml)</label><input name="volume" type="number" defaultValue="300" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Data Coleta *</label><input name="coleta" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Data Validade *</label><input name="validade" type="date" required defaultValue={new Date(Date.now() + 86400000*42).toISOString().split('T')[0]} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Origem/Hemocentro</label><input name="origem" placeholder="Ex: HEMOCE" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Status Sorologias</label><select name="sorologias" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}><option value="Liberado">✅ Liberado para Uso</option><option value="Pendente">⏳ Aguardando Laudo</option><option value="Bloqueada">🚫 Bloqueada/Reagente</option></select></div>
                
                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-danger" style={{ width: '100%', padding: '16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}><i className="las la-save"></i> Registrar Bolsa no Estoque</button>
                </div>
              </form>
            </div>

            <div className="entrada-log" style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ color: '#0a1f44', marginBottom: '18px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}><i className="las la-history"></i> Últimas Entradas Registradas</h3>
              {logEntradas.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Nenhuma entrada registrada</p> : 
                logEntradas.map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', minWidth: '140px' }}><i className="las la-calendar"></i> {new Date(log.data).toLocaleString('pt-BR')}</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#0a1f44' }}>{getIcone(log.componente)} {log.tipo} — {getAbrev(log.componente)}</strong>
                      <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>Bolsa: {log.numero} | Origem: {log.origem || 'N/I'}</small>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>+1</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* --- ABA TRANSFUSÃO --- */}
        {activeTab === 'transfusao' && (
          <div className="animate-in fade-in duration-300">
            <div className="form-panel" style={{ background: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ color: '#0a1f44', marginBottom: '22px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-syringe"></i> Registrar Transfusão (Saída de Bolsa)</h3>
              <form onSubmit={formTransfusao} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Paciente *</label>
                  <select name="paciente" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}><option value="">Selecione o paciente internado...</option>{pacientesMock.map(p => <option key={p} value={p}>{p}</option>)}</select>
                </div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Tipagem do Paciente</label>
                  <select name="tipoPaciente" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}><option value="">Desconhecida (Urgência O-)</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Selecione a Bolsa (Disponíveis em Estoque) *</label>
                  <select name="bolsaId" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
                    <option value="">Selecione...</option>
                    {disponiveis.map(b => <option key={b.id} value={b.id}>{getIcone(b.componente)} {b.numero} | {b.tipo} | {b.componente} | Val: {new Date(b.validade).toLocaleDateString()}</option>)}
                  </select>
                </div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Data e Hora Início *</label><input name="data" type="datetime-local" required defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Médico Prescritor *</label><input name="medico" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                <div><label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Enfermeiro Executante</label><input name="enfermeiro" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                
                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-warning" style={{ width: '100%', padding: '16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}><i className="las la-save"></i> Registrar Transfusão e Baixar Estoque</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ABA HISTÓRICO --- */}
        {activeTab === 'historico' && (
          <div className="animate-in fade-in duration-300">
            <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a', color: 'white', textAlign: 'left' }}>
                  <tr><th style={{ padding: '15px' }}>Data/Hora</th><th style={{ padding: '15px' }}>Paciente</th><th style={{ padding: '15px' }}>Bolsa/Lote</th><th style={{ padding: '15px' }}>Componente</th><th style={{ padding: '15px' }}>Tipagem</th><th style={{ padding: '15px' }}>Médico</th></tr>
                </thead>
                <tbody>
                  {transfusoes.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhuma transfusão registrada</td></tr> :
                    transfusoes.map(t => {
                      const bolsa = bolsas.find(b => b.id === t.bolsaId);
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '15px' }}>{new Date(t.data).toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '15px', fontWeight: 'bold' }}>{t.paciente}</td>
                          <td style={{ padding: '15px' }}>{bolsa ? `${getIcone(bolsa.componente)} ${bolsa.numero}` : 'N/D'}</td>
                          <td style={{ padding: '15px' }}>{bolsa ? bolsa.componente : 'N/D'}</td>
                          <td style={{ padding: '15px' }}><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '8px', fontWeight: 'bold' }}>{bolsa ? bolsa.tipo : 'N/D'}</span></td>
                          <td style={{ padding: '15px', color: '#64748b' }}>{t.medico}</td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA COMPATIBILIDADE --- */}
        {activeTab === 'compatibilidade' && (
          <div className="animate-in fade-in duration-300 form-panel" style={{ background: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <h3 style={{ color: '#0a1f44', marginBottom: '22px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}><i className="las la-project-diagram"></i> Tabela de Compatibilidade de Concentrado de Hemácias</h3>
            <div className="compat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>A+</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: A+, A-, O+, O-<br/>Doa: A+, AB+</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>A-</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: A-, O-<br/>Doa: A+, A-, AB+, AB-</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>B+</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: B+, B-, O+, O-<br/>Doa: B+, AB+</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>B-</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: B-, O-<br/>Doa: B+, B-, AB+, AB-</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>AB+</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: TODOS (Universal)<br/>Doa: AB+</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>AB-</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: A-, B-, AB-, O-<br/>Doa: AB+, AB-</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>O+</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: O+, O-<br/>Doa: A+, B+, AB+, O+</div></div>
              <div className="compat-item" style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '18px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', marginBottom: '5px' }}>O-</div><div style={{ fontSize: '12px', color: '#64748b' }}>Recebe: O- <br/>Doa: TODOS (Universal)</div></div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '18px', marginTop: '20px', textAlign: 'center', border: '2px solid #fecaca' }}>
              <strong style={{ color: '#dc2626' }}>⚠️ PROTOCOLO DE EMERGÊNCIA (Tipagem desconhecida):</strong> Paciente Mulher Fértil → <strong>O NEGATIVO</strong> | Homem/Mulher Pós-menopausa → <strong>O POSITIVO</strong>
            </div>
          </div>
        )}

        {/* --- ABA SOLICITAÇÕES --- */}
        {activeTab === 'solicitacoes' && (
          <div className="animate-in fade-in duration-300">
             <div className="form-panel" style={{ background: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', marginBottom: '25px' }}>
               <h3 style={{ color: '#0a1f44', marginBottom: '22px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-ambulance"></i> Nova Solicitação ao Hemocentro</h3>
               <form onSubmit={formSolicitacao} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                 <div style={{ flex: 1, minWidth: '200px' }}><label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Tipo Sanguíneo Urgente</label><input name="tipo" required placeholder="Ex: O-, A+, CH, Plaquetas" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                 <div style={{ width: '150px' }}><label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Qtd. de Bolsas</label><input name="qtd" type="number" min="1" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }} /></div>
                 <button type="submit" className="btn btn-info" style={{ padding: '12px 25px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '44px' }}>Enviar Pedido</button>
               </form>
             </div>

             <div style={{ display: 'grid', gap: '10px' }}>
                {solicitacoes.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Nenhuma solicitação enviada</p> :
                  solicitacoes.map(s => (
                    <div key={s.id} style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '8px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#1e3a8a', fontSize: '16px' }}>🩸 {s.quantidade}x Bolsa(s) de {s.tipo}</strong>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>Enviado em {new Date(s.data).toLocaleString('pt-BR')}</div>
                      </div>
                      <span style={{ background: '#3b82f6', color: 'white', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>{s.status}</span>
                    </div>
                  ))
                }
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
