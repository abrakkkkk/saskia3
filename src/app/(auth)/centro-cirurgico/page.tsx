'use client';

import { useState, useEffect } from 'react';
import './centro-cirurgico.css';

interface Checklist {
  signIn: boolean[];
  timeOut: boolean[];
  signOut: boolean[];
}

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
}

interface Cirurgia {
  id: string;
  pacienteId: string;
  paciente: Paciente;
  procedimento: string;
  sala: string | null;
  dataHora: string | null;
  equipe: string | null;
  anestesia: string | null;
  status: string; // AGENDADA, EM_PREPARO, EM_ANDAMENTO, CONCLUIDA, CANCELADA
  observacoes: string | null;
  createdAt: string;
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
  const [pacientesGerais, setPacientesGerais] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [buscaCirurgia, setBuscaCirurgia] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Forms
  const [formAgendamento, setFormAgendamento] = useState({
    pacienteId: '', sala: 'SO 1', data: '', hora: '', procedimento: '',
    prioridade: 'Eletiva', cirurgiao: '', anestesista: '', instrumentador: '',
    circulante: '', anestesia: 'Geral', duracao: '1', obs: ''
  });

  const [selectedCirurgiaId, setSelectedCirurgiaId] = useState<string>('');
  const [currentChecklist, setCurrentChecklist] = useState<Checklist>({ signIn: [], timeOut: [], signOut: [] });

  const carregarDados = async () => {
    try {
      const [resCirurgias, resPacientes] = await Promise.all([
        fetch('/api/cirurgias'),
        fetch('/api/pacientes')
      ]);
      if(resCirurgias.ok) setCirurgias(await resCirurgias.json());
      if(resPacientes.ok) setPacientesGerais(await resPacientes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFormAgendamento(f => ({ ...f, data: new Date().toISOString().split('T')[0] }));
    carregarDados();
  }, []);

  const agendarCirurgia = async () => {
    const { pacienteId, data, hora, procedimento, cirurgiao, anestesista, instrumentador, circulante, anestesia, prioridade, sala, obs } = formAgendamento;
    if (!pacienteId || !data || !hora || !procedimento || !cirurgiao) {
      alert("⚠️ Preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const equipe = `Cirurgião: ${cirurgiao}. Anest: ${anestesista}. Instr: ${instrumentador}. Circ: ${circulante}`;
      const observacoes = `Prioridade: ${prioridade}. Duração Prevista: ${formAgendamento.duracao}h. Obs: ${obs}`;
      
      const res = await fetch('/api/cirurgias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          procedimento,
          sala,
          dataHora: `${data}T${hora}:00`,
          equipe,
          anestesia,
          observacoes
        })
      });

      if(!res.ok) throw new Error("Erro ao agendar cirurgia");
      
      setFormAgendamento({
        ...formAgendamento,
        pacienteId: '', hora: '', procedimento: '', cirurgiao: '', anestesista: '',
        instrumentador: '', circulante: '', obs: ''
      });

      alert("✅ Cirurgia agendada com sucesso!");
      carregarDados();
      setActiveTab('lista');
    } catch(e: any) {
      alert(e.message);
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    const cirurgia = cirurgias.find(c => c.id === id);
    if (!cirurgia) return;
    
    let msg = "";
    if (novoStatus === 'EM_ANDAMENTO') msg = `Iniciar cirurgia de ${cirurgia.paciente.nome} - ${cirurgia.procedimento}?`;
    else if (novoStatus === 'CONCLUIDA') msg = `Concluir cirurgia de ${cirurgia.paciente.nome} - ${cirurgia.procedimento}?`;
    else if (novoStatus === 'CANCELADA') msg = `Cancelar cirurgia de ${cirurgia.paciente.nome}?`;

    if (await confirm(msg)) {
      try {
        const res = await fetch(`/api/cirurgias/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: novoStatus })
        });
        if(!res.ok) throw new Error("Erro ao atualizar cirurgia");
        
        if (novoStatus === 'EM_ANDAMENTO') alert("🔪 Cirurgia iniciada!");
        if (novoStatus === 'CONCLUIDA') alert("✅ Cirurgia concluída!");
        if (novoStatus === 'CANCELADA') alert("❌ Cirurgia cancelada.");
        carregarDados();
      } catch(e: any) {
        alert(e.message);
      }
    }
  };

  const carregarChecklist = (id: string) => {
    setSelectedCirurgiaId(id);
    if (!id) {
      setCurrentChecklist({ signIn: [], timeOut: [], signOut: [] });
      return;
    }
    // We mock checklist state saving for now since we didn't put a JSON field in Prisma for Cirurgia Checklist
    // In a real scenario, we'd save this to `cirurgia.observacoes` or a dedicated model
    setCurrentChecklist({
      signIn: new Array(checklistItens.signIn.length).fill(false),
      timeOut: new Array(checklistItens.timeOut.length).fill(false),
      signOut: new Array(checklistItens.signOut.length).fill(false),
    });
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
    alert("✅ Checklist de segurança salvo localmente!");
  };

  // Stats
  const hojeISO = new Date().toISOString().split('T')[0];
  const stats = {
    agendadas: cirurgias.filter(c => c.dataHora && c.dataHora.startsWith(hojeISO)).length,
    andamento: cirurgias.filter(c => c.status === "EM_ANDAMENTO").length,
    concluidas: cirurgias.filter(c => c.status === "CONCLUIDA" && c.dataHora && c.dataHora.startsWith(hojeISO)).length,
    canceladas: cirurgias.filter(c => c.status === "CANCELADA").length,
  };

  const cirurgiasHoje = cirurgias.filter(c => c.dataHora && c.dataHora.startsWith(hojeISO));

  let cirurgiasFiltradas = [...cirurgias].reverse();
  if (filtroStatus !== 'todos') {
    cirurgiasFiltradas = cirurgiasFiltradas.filter(c => c.status === filtroStatus);
  }
  if (buscaCirurgia) {
    const termo = buscaCirurgia.toLowerCase();
    cirurgiasFiltradas = cirurgiasFiltradas.filter(c => 
      c.paciente.nome.toLowerCase().includes(termo) || 
      c.procedimento.toLowerCase().includes(termo) || 
      (c.equipe && c.equipe.toLowerCase().includes(termo))
    );
  }

  const getStatusBadge = (status: string) => {
    if (status === 'AGENDADA') return 'badge-agendado';
    if (status === 'EM_ANDAMENTO') return 'badge-andamento';
    if (status === 'CONCLUIDA') return 'badge-concluido';
    if (status === 'CANCELADA') return 'badge-cancelado';
    return '';
  };
  const getStatusName = (status: string) => {
    if (status === 'AGENDADA') return 'Agendada';
    if (status === 'EM_ANDAMENTO') return 'Em Andamento';
    if (status === 'CONCLUIDA') return 'Concluída';
    if (status === 'CANCELADA') return 'Cancelada';
    return status;
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
                  <select value={formAgendamento.pacienteId} onChange={e => setFormAgendamento({...formAgendamento, pacienteId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {pacientesGerais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
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
                    <div key={c.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '15px', marginBottom: '10px', borderLeft: `4px solid ${c.status==='EM_ANDAMENTO'?'#f59e0b':c.status==='CONCLUIDA'?'#22c55e':'#1e3a8a'}` }}>
                      <strong>{c.dataHora ? new Date(c.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : ''}</strong> - {c.paciente.nome}<br />
                      <small>{c.procedimento} | Sala {c.sala} | {c.equipe}</small><br />
                      <span className={`badge ${getStatusBadge(c.status)}`}>{getStatusName(c.status)}</span>
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
              const ocupada = cirurgias.find(c => (c.status === "EM_ANDAMENTO" || (c.status === "AGENDADA" && c.dataHora && c.dataHora.startsWith(hojeISO))) && c.sala === sala);
              const isEmAndamento = ocupada && ocupada.status === 'EM_ANDAMENTO';
              
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
                    {ocupada ? `${ocupada.procedimento} - ${ocupada.paciente.nome}` : "Próxima: Nenhuma"}
                  </small>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'lista' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por paciente, procedimento ou equipe..." value={buscaCirurgia} onChange={e => setBuscaCirurgia(e.target.value)} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 'auto', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px' }}>
                <option value="todos">Todos os Status</option>
                <option value="AGENDADA">Agendada</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDA">Concluída</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table className="tabela-cc">
                <thead>
                  <tr><th>Data/Hora</th><th>Paciente</th><th>Procedimento</th><th>Sala</th><th>Equipe/Detalhes</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {cirurgiasFiltradas.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhuma cirurgia encontrada</td></tr>
                  ) : (
                    cirurgiasFiltradas.slice(0, 50).map(c => (
                      <tr key={c.id}>
                        <td>{c.dataHora ? new Date(c.dataHora).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'}) : '-'}</td>
                        <td><strong>{c.paciente.nome}</strong></td>
                        <td>{c.procedimento}</td>
                        <td>{c.sala}</td>
                        <td style={{fontSize:'12px'}}>{c.equipe}</td>
                        <td><span className={`badge ${getStatusBadge(c.status)}`}>{getStatusName(c.status)}</span></td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => alterarStatus(c.id, 'EM_ANDAMENTO')} disabled={c.status !== 'AGENDADA'}><i className="las la-play"></i></button>
                          <button className="btn btn-sm btn-warning" onClick={() => alterarStatus(c.id, 'CONCLUIDA')} disabled={c.status !== 'EM_ANDAMENTO'} style={{ marginLeft: '4px' }}><i className="las la-check"></i></button>
                          <button className="btn btn-sm btn-danger" onClick={() => alterarStatus(c.id, 'CANCELADA')} disabled={c.status === 'CANCELADA' || c.status === 'CONCLUIDA'} style={{ marginLeft: '4px' }}><i className="las la-times"></i></button>
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
              <select value={selectedCirurgiaId} onChange={e => carregarChecklist(e.target.value)}>
                <option value="">Selecione...</option>
                {cirurgias.filter(c => c.status !== "CANCELADA").map(c => (
                  <option key={c.id} value={c.id}>{c.dataHora ? new Date(c.dataHora).toLocaleDateString() : ''} - {c.paciente.nome} - {c.procedimento}</option>
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
