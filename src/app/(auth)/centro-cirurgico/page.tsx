'use client';

import { useState, useEffect } from 'react';
import './centro-cirurgico.css';

interface Checklist {
  signIn: boolean[];
  timeOut: boolean[];
  signOut: boolean[];
}

interface Cirurgia {
  id: number;
  paciente: string;
  sala: string;
  data: string;
  hora: string;
  procedimento: string;
  prioridade: string;
  cirurgiao: string;
  anestesista: string;
  instrumentador: string;
  circulante: string;
  anestesia: string;
  duracao: string;
  obs: string;
  status: string;
  dataCriacao: string;
  checklist: Checklist | null;
}

const checklistItens = {
  signIn: [
    "Paciente confirmou identidade, sítio cirúrgico e procedimento",
    "Sítio cirúrgico demarcado",
    "Verificação de segurança anestésica concluída",
    "Oxímetro de pulso colocado e funcionando",
    "Paciente possui alergia conhecida?",
    "Via aérea difícil ou risco de aspiração?",
    "Risco de perda sanguínea > 500ml?"
  ],
  timeOut: [
    "Confirmar nomes de todos os membros da equipe",
    "Cirurgião, anestesista e enfermeiro confirmam: paciente, sítio e procedimento",
    "Antecipação de eventos críticos pelo cirurgião",
    "Antecipação de eventos críticos pelo anestesista",
    "Antecipação de eventos críticos pela enfermagem",
    "Profilaxia antibiótica realizada nos últimos 60 min?",
    "Imagens essenciais disponíveis?"
  ],
  signOut: [
    "Enfermeiro confirma nome do procedimento",
    "Contagem de compressas, gazes e agulhas correta",
    "Amostras identificadas corretamente",
    "Problemas com equipamentos a serem resolvidos?",
    "Plano de cuidados pós-operatórios revisado"
  ]
};

const SALAS = ["SO 1", "SO 2", "SO 3", "SO 4"];

export default function CentroCirurgicoPage() {
  const [activeTab, setActiveTab] = useState<'agendamento' | 'salas' | 'lista' | 'checklist'>('agendamento');
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [hospitalId, setHospitalId] = useState<string>('hospital_001');
  const [pacientesGerais, setPacientesGerais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [buscaCirurgia, setBuscaCirurgia] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Forms
  const [formAgendamento, setFormAgendamento] = useState({
    paciente: '', sala: 'SO 1', data: '', hora: '', procedimento: '',
    prioridade: 'Eletiva', cirurgiao: '', anestesista: '', instrumentador: '',
    circulante: '', anestesia: 'Geral', duracao: '1', obs: ''
  });

  const [selectedCirurgiaId, setSelectedCirurgiaId] = useState<number | ''>('');
  const [currentChecklist, setCurrentChecklist] = useState<Checklist>({ signIn: [], timeOut: [], signOut: [] });

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      const savedCirurgias = JSON.parse(localStorage.getItem(`${hid}_ccCirurgias`) || '[]');
      setCirurgias(savedCirurgias);

      fetch('/api/pacientes').then(res => res.json()).then(data => setPacientesGerais(data));

      setFormAgendamento(f => ({ ...f, data: new Date().toISOString().split('T')[0] }));
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const saveCirurgias = (novaLista: Cirurgia[]) => {
    setCirurgias(novaLista);
    localStorage.setItem(`${hospitalId}_ccCirurgias`, JSON.stringify(novaLista));
  };

  const agendarCirurgia = () => {
    const { paciente, data, hora, procedimento, cirurgiao } = formAgendamento;
    if (!paciente || !data || !hora || !procedimento || !cirurgiao) {
      alert("⚠️ Preencha todos os campos obrigatórios (*)");
      return;
    }

    const novaCirurgia: Cirurgia = {
      id: Date.now(),
      ...formAgendamento,
      status: "Agendado",
      dataCriacao: new Date().toISOString(),
      checklist: null
    };

    saveCirurgias([...cirurgias, novaCirurgia]);
    
    setFormAgendamento({
      ...formAgendamento,
      paciente: '', hora: '', procedimento: '', cirurgiao: '', anestesista: '',
      instrumentador: '', circulante: '', obs: ''
    });

    alert("✅ Cirurgia agendada com sucesso!");
  };

  const alterarStatus = (id: number, novoStatus: string) => {
    const cirurgia = cirurgias.find(c => c.id === id);
    if (!cirurgia) return;
    
    let msg = "";
    if (novoStatus === 'Em Andamento') msg = `Iniciar cirurgia de ${cirurgia.paciente} - ${cirurgia.procedimento}?`;
    else if (novoStatus === 'Concluído') msg = `Concluir cirurgia de ${cirurgia.paciente} - ${cirurgia.procedimento}?`;
    else if (novoStatus === 'Cancelado') msg = `Cancelar cirurgia de ${cirurgia.paciente}?`;

    if (confirm(msg)) {
      const novaLista = cirurgias.map(c => c.id === id ? { ...c, status: novoStatus } : c);
      saveCirurgias(novaLista);
      if (novoStatus === 'Em Andamento') alert("🔪 Cirurgia iniciada!");
      if (novoStatus === 'Concluído') alert("✅ Cirurgia concluída!");
      if (novoStatus === 'Cancelado') alert("❌ Cirurgia cancelada.");
    }
  };

  const carregarChecklist = (id: number | '') => {
    setSelectedCirurgiaId(id);
    if (!id) {
      setCurrentChecklist({ signIn: [], timeOut: [], signOut: [] });
      return;
    }
    const c = cirurgias.find(cir => cir.id === id);
    if (c && c.checklist) {
      setCurrentChecklist(c.checklist);
    } else {
      setCurrentChecklist({
        signIn: new Array(checklistItens.signIn.length).fill(false),
        timeOut: new Array(checklistItens.timeOut.length).fill(false),
        signOut: new Array(checklistItens.signOut.length).fill(false),
      });
    }
  };

  const toggleChecklist = (secao: 'signIn' | 'timeOut' | 'signOut', index: number) => {
    setCurrentChecklist(prev => {
      const novos = [...prev[secao]];
      novos[index] = !novos[index];
      return { ...prev, [secao]: novos };
    });
  };

  const salvarChecklist = () => {
    if (!selectedCirurgiaId) { alert("Selecione uma cirurgia!"); return; }
    const novaLista = cirurgias.map(c => c.id === selectedCirurgiaId ? { ...c, checklist: currentChecklist } : c);
    saveCirurgias(novaLista);
    alert("✅ Checklist de segurança salvo!");
  };

  // Stats
  const hojeISO = new Date().toISOString().split('T')[0];
  const stats = {
    agendadas: cirurgias.filter(c => c.data === hojeISO).length,
    andamento: cirurgias.filter(c => c.status === "Em Andamento").length,
    concluidas: cirurgias.filter(c => c.status === "Concluído" && c.data === hojeISO).length,
    canceladas: cirurgias.filter(c => c.status === "Cancelado").length,
  };

  const cirurgiasHoje = cirurgias.filter(c => c.data === hojeISO);

  let cirurgiasFiltradas = [...cirurgias].reverse();
  if (filtroStatus !== 'todos') {
    cirurgiasFiltradas = cirurgiasFiltradas.filter(c => c.status === filtroStatus);
  }
  if (buscaCirurgia) {
    const termo = buscaCirurgia.toLowerCase();
    cirurgiasFiltradas = cirurgiasFiltradas.filter(c => 
      c.paciente.toLowerCase().includes(termo) || 
      c.procedimento.toLowerCase().includes(termo) || 
      c.cirurgiao.toLowerCase().includes(termo)
    );
  }

  const getPrioridadeBadge = (prioridade: string) => {
    if (prioridade === 'Emergência') return 'badge-emergencia';
    if (prioridade === 'Urgência') return 'badge-urgencia';
    return 'badge-eletiva';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Agendado') return 'badge-agendado';
    if (status === 'Em Andamento') return 'badge-andamento';
    if (status === 'Recuperação') return 'badge-recuperacao';
    if (status === 'Concluído') return 'badge-concluido';
    if (status === 'Cancelado') return 'badge-cancelado';
    return '';
  };

  if (loading) return <div>Carregando Centro Cirúrgico...</div>;

  return (
    <div className="conteudo">
      <div className="cc-container">

        <div className="banner-cc">
          <div>
            <h1><i className="las la-scalpel"></i> Centro Cirúrgico</h1>
            <p>Gestão de cirurgias, salas, equipe e checklist de segurança</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={() => setActiveTab('agendamento')}>
              <i className="las la-plus-circle"></i> Agendar Cirurgia
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><i className="las la-calendar-check"></i></div><div className="stat-numero">{stats.agendadas}</div><div className="stat-label">Cirurgias Hoje</div></div>
          <div className="stat-card"><div className="stat-icon orange"><i className="las la-clock"></i></div><div className="stat-numero">{stats.andamento}</div><div className="stat-label">Em Andamento</div></div>
          <div className="stat-card"><div className="stat-icon green"><i className="las la-check-circle"></i></div><div className="stat-numero">{stats.concluidas}</div><div className="stat-label">Concluídas Hoje</div></div>
          <div className="stat-card"><div className="stat-icon purple"><i className="las la-door-open"></i></div><div className="stat-numero">{SALAS.length}</div><div className="stat-label">Total Salas</div></div>
          <div className="stat-card"><div className="stat-icon red"><i className="las la-exclamation-triangle"></i></div><div className="stat-numero">{stats.canceladas}</div><div className="stat-label">Canceladas</div></div>
        </div>

        <div className="tabs-cc">
          <button className={`tab-btn ${activeTab === 'agendamento' ? 'ativo' : ''}`} onClick={() => setActiveTab('agendamento')}><i className="las la-calendar-plus"></i> Agendamento</button>
          <button className={`tab-btn ${activeTab === 'salas' ? 'ativo' : ''}`} onClick={() => setActiveTab('salas')}><i className="las la-door-open"></i> Salas Cirúrgicas</button>
          <button className={`tab-btn ${activeTab === 'lista' ? 'ativo' : ''}`} onClick={() => setActiveTab('lista')}><i className="las la-list"></i> Lista de Cirurgias</button>
          <button className={`tab-btn ${activeTab === 'checklist' ? 'ativo' : ''}`} onClick={() => setActiveTab('checklist')}><i className="las la-clipboard-check"></i> Checklist</button>
        </div>

        {activeTab === 'agendamento' && (
          <div className="cc-grid">
            <div className="cc-panel">
              <h3><i className="las la-calendar-plus"></i> Agendar Nova Cirurgia</h3>
              <div className="form-grid">
                <div className="form-grupo">
                  <label>Paciente *</label>
                  <select value={formAgendamento.paciente} onChange={e => setFormAgendamento({...formAgendamento, paciente: e.target.value})}>
                    <option value="">Selecione...</option>
                    {pacientesGerais.map((p, i) => <option key={i} value={p.nome}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Sala Cirúrgica *</label>
                  <select value={formAgendamento.sala} onChange={e => setFormAgendamento({...formAgendamento, sala: e.target.value})}>
                    {SALAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-grupo"><label>Data *</label><input type="date" value={formAgendamento.data} onChange={e => setFormAgendamento({...formAgendamento, data: e.target.value})} /></div>
                <div className="form-grupo"><label>Horário *</label><input type="time" value={formAgendamento.hora} onChange={e => setFormAgendamento({...formAgendamento, hora: e.target.value})} /></div>
                <div className="form-grupo"><label>Procedimento *</label><input type="text" placeholder="Nome do procedimento" value={formAgendamento.procedimento} onChange={e => setFormAgendamento({...formAgendamento, procedimento: e.target.value})} /></div>
                <div className="form-grupo">
                  <label>Prioridade</label>
                  <select value={formAgendamento.prioridade} onChange={e => setFormAgendamento({...formAgendamento, prioridade: e.target.value})}>
                    <option>Eletiva</option><option>Urgência</option><option>Emergência</option>
                  </select>
                </div>
                <div className="form-grupo"><label>Cirurgião Responsável *</label><input type="text" placeholder="Nome do cirurgião" value={formAgendamento.cirurgiao} onChange={e => setFormAgendamento({...formAgendamento, cirurgiao: e.target.value})} /></div>
                <div className="form-grupo"><label>Anestesista</label><input type="text" placeholder="Nome do anestesista" value={formAgendamento.anestesista} onChange={e => setFormAgendamento({...formAgendamento, anestesista: e.target.value})} /></div>
                <div className="form-grupo"><label>Enfermeiro Instrumentador</label><input type="text" placeholder="Nome" value={formAgendamento.instrumentador} onChange={e => setFormAgendamento({...formAgendamento, instrumentador: e.target.value})} /></div>
                <div className="form-grupo"><label>Enfermeiro Circulante</label><input type="text" placeholder="Nome" value={formAgendamento.circulante} onChange={e => setFormAgendamento({...formAgendamento, circulante: e.target.value})} /></div>
                <div className="form-grupo">
                  <label>Anestesia Prevista</label>
                  <select value={formAgendamento.anestesia} onChange={e => setFormAgendamento({...formAgendamento, anestesia: e.target.value})}>
                    <option>Geral</option><option>Regional</option><option>Local</option><option>Sedativo</option>
                  </select>
                </div>
                <div className="form-grupo"><label>Duração Prevista (h)</label><input type="number" min="0.5" step="0.5" value={formAgendamento.duracao} onChange={e => setFormAgendamento({...formAgendamento, duracao: e.target.value})} /></div>
                <div className="form-grupo full"><label>Observações</label><textarea rows={2} value={formAgendamento.obs} onChange={e => setFormAgendamento({...formAgendamento, obs: e.target.value})}></textarea></div>
              </div>
              <button className="btn btn-success" onClick={agendarCirurgia} style={{ width: '100%', marginTop: '15px', justifyContent: 'center', padding: '14px' }}>
                <i className="las la-save"></i> Agendar Cirurgia
              </button>
            </div>
            <div className="cc-panel">
              <h3><i className="las la-list-alt"></i> Cirurgias de Hoje</h3>
              <div>
                {cirurgiasHoje.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>Nenhuma cirurgia agendada para hoje.</p>
                ) : (
                  cirurgiasHoje.map(c => (
                    <div key={c.id} style={{ background: '#f8fafc', borderRadius: '12px', padding: '15px', marginBottom: '10px', borderLeft: `4px solid ${c.status==='Em Andamento'?'#f59e0b':c.status==='Concluído'?'#22c55e':'#1e3a8a'}` }}>
                      <strong>{c.hora}</strong> - {c.paciente}<br />
                      <small>{c.procedimento} | Sala {c.sala} | {c.cirurgiao}</small><br />
                      <span className={`badge ${getPrioridadeBadge(c.prioridade)}`}>{c.prioridade}</span>{' '}
                      <span className={`badge ${getStatusBadge(c.status)}`}>{c.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salas' && (
          <div className="salas-grid">
            {SALAS.map(sala => {
              const ocupada = cirurgias.find(c => (c.status === "Em Andamento" || (c.status === "Agendado" && c.data === hojeISO)) && c.sala === sala);
              const isEmAndamento = ocupada && ocupada.status === 'Em Andamento';
              
              let classe = "disponivel";
              let statusText = "✅ Disponível";
              if (isEmAndamento) {
                classe = "ocupada"; statusText = "🔴 Ocupada";
              } else if (ocupada) {
                classe = "limpeza"; statusText = "🟡 Reservada (Agendada p/ hoje)";
              }

              return (
                <div key={sala} className={`sala-card ${classe}`}>
                  <div className="sala-numero">{sala}</div>
                  <div className="sala-status">{statusText}</div>
                  <small style={{ color: '#94a3b8' }}>
                    {ocupada ? `${ocupada.procedimento} - ${ocupada.paciente}` : "Próxima: Nenhuma"}
                  </small>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'lista' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por paciente, procedimento ou cirurgião..." value={buscaCirurgia} onChange={e => setBuscaCirurgia(e.target.value)} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 'auto', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '12px' }}>
                <option value="todos">Todos os Status</option>
                <option value="Agendado">Agendado</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Recuperação">Recuperação</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table className="tabela-cc">
                <thead>
                  <tr><th>Data/Hora</th><th>Paciente</th><th>Procedimento</th><th>Sala</th><th>Cirurgião</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {cirurgiasFiltradas.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhuma cirurgia encontrada</td></tr>
                  ) : (
                    cirurgiasFiltradas.slice(0, 50).map(c => (
                      <tr key={c.id}>
                        <td>{c.data ? new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} {c.hora}</td>
                        <td><strong>{c.paciente}</strong></td>
                        <td>{c.procedimento}</td>
                        <td>{c.sala}</td>
                        <td>{c.cirurgiao}</td>
                        <td><span className={`badge ${getPrioridadeBadge(c.prioridade)}`}>{c.prioridade}</span></td>
                        <td><span className={`badge ${getStatusBadge(c.status)}`}>{c.status}</span></td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => alterarStatus(c.id, 'Em Andamento')} disabled={c.status !== 'Agendado'}><i className="las la-play"></i></button>
                          <button className="btn btn-sm btn-warning" onClick={() => alterarStatus(c.id, 'Concluído')} disabled={c.status !== 'Em Andamento'} style={{ marginLeft: '4px' }}><i className="las la-check"></i></button>
                          <button className="btn btn-sm btn-danger" onClick={() => alterarStatus(c.id, 'Cancelado')} disabled={c.status === 'Cancelado' || c.status === 'Concluído'} style={{ marginLeft: '4px' }}><i className="las la-times"></i></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="cc-panel">
            <h3><i className="las la-clipboard-check"></i> Checklist de Segurança Cirúrgica (OMS)</h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '13px' }}>Selecione a cirurgia para preencher o checklist:</p>
            <div className="form-grupo">
              <label>Cirurgia</label>
              <select value={selectedCirurgiaId} onChange={e => carregarChecklist(e.target.value ? parseInt(e.target.value) : '')}>
                <option value="">Selecione...</option>
                {cirurgias.filter(c => c.status !== "Cancelado").map(c => (
                  <option key={c.id} value={c.id}>{c.data} - {c.paciente} - {c.procedimento}</option>
                ))}
              </select>
            </div>
            
            {selectedCirurgiaId && (
              <>
                <h4 style={{ color: '#1e3a8a', margin: '20px 0 15px' }}>1. ANTES DA INDUÇÃO ANESTÉSICA (Sign In)</h4>
                <div className="checklist-grid">
                  {checklistItens.signIn.map((item, i) => (
                    <div key={i} className={`checklist-item ${currentChecklist.signIn[i] ? 'check' : ''}`} onClick={() => toggleChecklist('signIn', i)}>
                      <span className="check-icon">{currentChecklist.signIn[i] ? '✓' : ''}</span>
                      <span className="check-label">{item}</span>
                    </div>
                  ))}
                </div>

                <h4 style={{ color: '#1e3a8a', margin: '20px 0 15px' }}>2. ANTES DA INCISÃO CIRÚRGICA (Time Out)</h4>
                <div className="checklist-grid">
                  {checklistItens.timeOut.map((item, i) => (
                    <div key={i} className={`checklist-item ${currentChecklist.timeOut[i] ? 'check' : ''}`} onClick={() => toggleChecklist('timeOut', i)}>
                      <span className="check-icon">{currentChecklist.timeOut[i] ? '✓' : ''}</span>
                      <span className="check-label">{item}</span>
                    </div>
                  ))}
                </div>

                <h4 style={{ color: '#1e3a8a', margin: '20px 0 15px' }}>3. ANTES DO PACIENTE SAIR DA SALA (Sign Out)</h4>
                <div className="checklist-grid">
                  {checklistItens.signOut.map((item, i) => (
                    <div key={i} className={`checklist-item ${currentChecklist.signOut[i] ? 'check' : ''}`} onClick={() => toggleChecklist('signOut', i)}>
                      <span className="check-icon">{currentChecklist.signOut[i] ? '✓' : ''}</span>
                      <span className="check-label">{item}</span>
                    </div>
                  ))}
                </div>

                <button className="btn btn-success" onClick={salvarChecklist} style={{ width: '100%', marginTop: '20px', justifyContent: 'center', padding: '14px' }}>
                  <i className="las la-save"></i> Salvar Checklist
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
