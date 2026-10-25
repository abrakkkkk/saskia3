'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './centro-cirurgico.css';

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

function dataLocalKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function CentroCirurgicoPage() {
  const { data: session, status: sessionStatus } = useSession();
  const cargo = (session?.user as any)?.cargo;
  const podeGerenciar = cargo === 'ADMIN' || cargo === 'MEDICO';
  const [activeTab, setActiveTab] = useState<'agendamento' | 'salas' | 'lista'>('agendamento');
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [pacientesGerais, setPacientesGerais] = useState<Paciente[]>([]);
  const [salas, setSalas] = useState<string[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  // Filters
  const [buscaCirurgia, setBuscaCirurgia] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Forms
  const [formAgendamento, setFormAgendamento] = useState({
    pacienteId: '', sala: 'SO 1', data: '', hora: '', procedimento: '',
    prioridade: 'Eletiva', cirurgiao: '', anestesista: '', instrumentador: '',
    circulante: '', anestesia: 'Geral', duracao: '1', obs: ''
  });


  const carregarDados = async () => {
    try {
      const [resCirurgias, resPacientes, resSalas, resUsuarios] = await Promise.all([
        fetch('/api/cirurgias'),
        fetch('/api/pacientes'),
        fetch('/api/salas'),
        fetch('/api/chat/contatos')
      ]);
      if (!resCirurgias.ok || !resPacientes.ok || !resSalas.ok) {
        throw new Error('Não foi possível carregar os dados do centro cirúrgico. Atualize a página e tente novamente.');
      }
      if (resCirurgias.ok) {
        const dCir = await resCirurgias.json();
        setCirurgias(Array.isArray(dCir) ? dCir : []);
      }
      if (resPacientes.ok) {
        const dPac = await resPacientes.json();
        setPacientesGerais(Array.isArray(dPac) ? dPac : []);
      }
      if (resSalas.ok) {
        const dSalas = await resSalas.json();
        const salasNomes = Array.isArray(dSalas) ? dSalas.map((s: any) => s.nome).filter((nome: unknown): nome is string => typeof nome === 'string' && Boolean(nome.trim())) : [];
        setSalas(salasNomes);
        setFormAgendamento(prev => ({ ...prev, sala: salasNomes.includes(prev.sala) ? prev.sala : (salasNomes[0] || '') }));
      }
      if (resUsuarios.ok) {
        const dUsers = await resUsuarios.json();
        if (Array.isArray(dUsers)) setProfissionais(dUsers);
      }
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar dados do centro cirúrgico.');
      console.error('Erro ao carregar dados do centro cirúrgico:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFormAgendamento(f => ({ ...f, data: dataLocalKey(new Date()) }));
    carregarDados();
  }, []);

  const agendarCirurgia = async () => {
    const { pacienteId, data, hora, procedimento, cirurgiao, anestesista, instrumentador, circulante, anestesia, prioridade, sala, obs } = formAgendamento;
    if (!pacienteId || !sala || !salas.includes(sala) || !data || !hora || !procedimento.trim() || !cirurgiao.trim()) {
      alert(" Preencha todos os campos obrigatórios (*)");
      return;
    }

    const dataHoraSelecionada = new Date(`${data}T${hora}:00`);
    if (Number.isNaN(dataHoraSelecionada.getTime())) {
      alert('Data e horário inválidos.');
      return;
    }
    const dataHoraNova = dataHoraSelecionada.toISOString();
    
    // 1. Bloqueio Clínico: O mesmo paciente não pode estar agendado em 2 cirurgias no mesmo horário (Card 24)
    const conflitoPaciente = cirurgias.find(c => 
      c.pacienteId === pacienteId && 
      c.dataHora && 
      c.status !== 'CANCELADA' && 
      c.status !== 'CONCLUIDA' &&
      Math.abs(new Date(c.dataHora).getTime() - new Date(dataHoraNova).getTime()) < (parseFloat(formAgendamento.duracao || '2') * 3600 * 1000)
    );

    if (conflitoPaciente) {
      const horaStr = conflitoPaciente.dataHora ? new Date(conflitoPaciente.dataHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'horário agendado';
      alert(` Bloqueio Clínico de Segurança: O paciente selecionado já possui cirurgia agendada ("${conflitoPaciente.procedimento}" às ${horaStr} na sala ${conflitoPaciente.sala}). Não é permitido agendamento simultâneo!`);
      return;
    }

    // 2. Conflito de ocupação da Sala Cirúrgica
    const conflito = cirurgias.find(c => 
      c.sala === sala && 
      c.dataHora && 
      c.status !== 'CANCELADA' && 
      c.status !== 'CONCLUIDA' &&
      Math.abs(new Date(c.dataHora).getTime() - new Date(dataHoraNova).getTime()) < (parseFloat(formAgendamento.duracao || '2') * 3600 * 1000)
    );

    if (conflito) {
      if (!await confirm(` Conflito de Agendamento: A sala "${sala}" já possui cirurgia agendada ("${conflito.procedimento}" - ${conflito.paciente?.nome || 'Paciente'}) no mesmo horário.\n\nDeseja confirmar o agendamento mesmo assim?`)) {
        return;
      }
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
          dataHora: dataHoraNova,
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

      alert(" Cirurgia agendada com sucesso!");
      carregarDados();
      setActiveTab('lista');
    } catch(e: any) {
      alert(e.message);
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    if (!podeGerenciar) return;
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
        
        if (novoStatus === 'EM_ANDAMENTO') alert(" Cirurgia iniciada!");
        if (novoStatus === 'CONCLUIDA') alert(" Cirurgia concluída!");
        if (novoStatus === 'CANCELADA') alert(" Cirurgia cancelada.");
        carregarDados();
      } catch(e: any) {
        alert(e.message);
      }
    }
  };


  // Stats
  const hojeISO = dataLocalKey(new Date());
  const stats = {
    agendadas: cirurgias.filter(c => c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO).length,
    andamento: cirurgias.filter(c => c.status === "EM_ANDAMENTO").length,
    concluidas: cirurgias.filter(c => c.status === "CONCLUIDA" && c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO).length,
    canceladas: cirurgias.filter(c => c.status === "CANCELADA").length,
  };

  const cirurgiasHoje = cirurgias.filter(c => c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO);

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

  if (loading && cirurgias.length === 0) {
    return (
      <div className="conteudo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Carregando dados do Centro Cirúrgico...</p>
      </div>
    );
  }

  return (
    <div className="conteudo">
      <div className="cc-container">

        <div className="banner-cc">
          <div>
            <h1><i className="las la-scalpel"></i> Centro Cirúrgico</h1>
            <p>Gestão de cirurgias e salas</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {podeGerenciar && <button className="btn btn-success" onClick={() => setActiveTab('agendamento')}>
              <i className="las la-plus-circle"></i> Agendar Cirurgia
            </button>}
          </div>
        </div>

        {erroCarga && <div role="alert" className="alert-erro" style={{ marginBottom: 16 }}>{erroCarga}</div>}

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><i className="las la-calendar-check"></i></div><div className="stat-numero">{stats.agendadas}</div><div className="stat-label">Cirurgias Hoje</div></div>
          <div className="stat-card"><div className="stat-icon orange"><i className="las la-clock"></i></div><div className="stat-numero">{stats.andamento}</div><div className="stat-label">Em Andamento</div></div>
          <div className="stat-card"><div className="stat-icon green"><i className="las la-check-circle"></i></div><div className="stat-numero">{stats.concluidas}</div><div className="stat-label">Concluídas Hoje</div></div>
          <div className="stat-card"><div className="stat-icon purple"><i className="las la-door-open"></i></div><div className="stat-numero">{salas.length}</div><div className="stat-label">Total Salas</div></div>
          <div className="stat-card"><div className="stat-icon red"><i className="las la-exclamation-triangle"></i></div><div className="stat-numero">{stats.canceladas}</div><div className="stat-label">Canceladas</div></div>
        </div>

        <div className="tabs-cc">
          {podeGerenciar && <button className={`tab-btn ${activeTab === 'agendamento' ? 'ativo' : ''}`} onClick={() => setActiveTab('agendamento')}><i className="las la-calendar-plus"></i> Agendamento</button>}
          <button className={`tab-btn ${activeTab === 'salas' ? 'ativo' : ''}`} onClick={() => setActiveTab('salas')}><i className="las la-door-open"></i> Salas Cirúrgicas</button>
          <button className={`tab-btn ${activeTab === 'lista' ? 'ativo' : ''}`} onClick={() => setActiveTab('lista')}><i className="las la-list"></i> Lista de Cirurgias</button>
        </div>

        {sessionStatus === 'authenticated' && !podeGerenciar && <div role="status" className="cc-panel" style={{ marginBottom: 16 }}>Somente ADMIN e MEDICO podem agendar cirurgias ou alterar status.</div>}

        {activeTab === 'agendamento' && podeGerenciar && (
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
                    <option value="">{salas.length ? 'Selecione uma sala' : 'Cadastre uma sala antes de agendar'}</option>
                    {salas.map(s => <option key={s} value={s}>{s}</option>)}
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
                <div className="form-grupo">
                  <label>Cirurgião Responsável *</label>
                  <input 
                    type="text" 
                    list="medicos-list"
                    placeholder="Selecione ou digite o cirurgião" 
                    value={formAgendamento.cirurgiao} 
                    onChange={e => setFormAgendamento({...formAgendamento, cirurgiao: e.target.value})} 
                  />
                  <datalist id="medicos-list">
                    {profissionais.filter(u => u.cargo?.toLowerCase().includes('medico') || u.cargo === 'ADMIN' || u.cargo === 'diretor_geral').map(u => (
                      <option key={u.id} value={`Dr(a). ${u.nome}`} />
                    ))}
                  </datalist>
                </div>
                <div className="form-grupo">
                  <label>Anestesista</label>
                  <input 
                    type="text" 
                    list="medicos-list"
                    placeholder="Selecione ou digite o anestesista" 
                    value={formAgendamento.anestesista} 
                    onChange={e => setFormAgendamento({...formAgendamento, anestesista: e.target.value})} 
                  />
                </div>
                <div className="form-grupo">
                  <label>Enfermeiro Instrumentador</label>
                  <input 
                    type="text" 
                    list="enfermeiros-list"
                    placeholder="Selecione ou digite o instrumentador" 
                    value={formAgendamento.instrumentador} 
                    onChange={e => setFormAgendamento({...formAgendamento, instrumentador: e.target.value})} 
                  />
                  <datalist id="enfermeiros-list">
                    {profissionais.filter(u => u.cargo?.toLowerCase().includes('enferm')).map(u => (
                      <option key={u.id} value={`Enf. ${u.nome}`} />
                    ))}
                  </datalist>
                </div>
                <div className="form-grupo">
                  <label>Enfermeiro Circulante</label>
                  <input 
                    type="text" 
                    list="enfermeiros-list"
                    placeholder="Selecione ou digite o circulante" 
                    value={formAgendamento.circulante} 
                    onChange={e => setFormAgendamento({...formAgendamento, circulante: e.target.value})} 
                  />
                </div>
                <div className="form-grupo">
                  <label>Anestesia Prevista</label>
                  <select value={formAgendamento.anestesia} onChange={e => setFormAgendamento({...formAgendamento, anestesia: e.target.value})}>
                    <option>Geral</option><option>Regional</option><option>Local</option><option>Sedativo</option>
                  </select>
                </div>
                <div className="form-grupo"><label>Duração Prevista (h)</label><input type="number" min="0.5" step="0.5" value={formAgendamento.duracao} onChange={e => setFormAgendamento({...formAgendamento, duracao: e.target.value})} /></div>
                <div className="form-grupo full"><label>Observações</label><textarea rows={2} value={formAgendamento.obs} onChange={e => setFormAgendamento({...formAgendamento, obs: e.target.value})}></textarea></div>
              </div>
              <button className="btn btn-success" onClick={agendarCirurgia} disabled={!salas.length || !pacientesGerais.length || loading} style={{ width: '100%', marginTop: '15px', justifyContent: 'center', padding: '14px' }}>
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
                    <div key={c.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '15px', marginBottom: '10px', borderTop: `3px solid ${c.status==='EM_ANDAMENTO'?'#f59e0b':c.status==='CONCLUIDA'?'#22c55e':'#1e3a8a'}` }}>
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
            {salas.map(sala => {
              const ocupada = cirurgias.find(c => (c.status === "EM_ANDAMENTO" || (c.status === "AGENDADA" && c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO)) && c.sala === sala);
              const isEmAndamento = ocupada && ocupada.status === 'EM_ANDAMENTO';
              
              let classe = "disponivel";
              let statusText = " Disponível";
              if (isEmAndamento) {
                classe = "ocupada"; statusText = " Ocupada";
              } else if (ocupada) {
                classe = "limpeza"; statusText = " Reservada (Agendada p/ hoje)";
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
                          {podeGerenciar && <>
                          <button className="btn btn-sm btn-primary" onClick={() => alterarStatus(c.id, 'EM_ANDAMENTO')} disabled={c.status !== 'AGENDADA'}><i className="las la-play"></i></button>
                          <button className="btn btn-sm btn-warning" onClick={() => alterarStatus(c.id, 'CONCLUIDA')} disabled={c.status !== 'EM_ANDAMENTO'} style={{ marginLeft: '4px' }}><i className="las la-check"></i></button>
                          <button className="btn btn-sm btn-danger" onClick={() => alterarStatus(c.id, 'CANCELADA')} disabled={c.status === 'CANCELADA' || c.status === 'CONCLUIDA'} style={{ marginLeft: '4px' }}><i className="las la-times"></i></button>
                          </>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
