'use client';
import { useState, useEffect } from 'react';
import './gestao-salas.css';

interface Sala {
  id: number;
  nome: string;
  tipo: string;
  setor: string;
  andar: string;
  capacidade: number;
  equipamentos: string;
  status: 'livre' | 'ocupado' | 'reservado' | 'manutencao';
}

interface Reserva {
  id: number;
  salaId: number;
  profissional: string;
  paciente: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  horaFimReal?: string;
  status: 'ativa' | 'reservada' | 'finalizada';
  liberacaoAutomatica?: boolean;
}

const tiposSala: Record<string, string> = {
  consultorio:"🏥 Consultório",
  cirurgica:"🔪 Sala Cirúrgica",
  exame:"🔬 Sala de Exames",
  reuniao:"💼 Sala de Reunião",
  triagem:"🩺 Sala de Triagem",
  observacao:"🛏️ Observação",
  procedimento:"💉 Procedimentos",
  aula:"📚 Aula/Treinamento",
  outro:"📋 Outro"
};

const statusLabel: Record<string, string> = {
  livre:"✅ Livre",
  ocupado:"🔴 Em Uso",
  reservado:"🟡 Reservada",
  manutencao:"⚫ Manutenção"
};

export default function GestaoSalasPage() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'cadastro' | 'reservas' | 'historico'>('mapa');
  const [hospitalId, setHospitalId] = useState<string>('hospital_001');
  const [loading, setLoading] = useState(true);

  const [salas, setSalas] = useState<Sala[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  // Filters
  const [buscarSala, setBuscarSala] = useState('');
  const [filtroStatusSala, setFiltroStatusSala] = useState('todos');
  const [buscarReserva, setBuscarReserva] = useState('');

  // Form Sala
  const [formSala, setFormSala] = useState({
    nome: '', tipo: 'consultorio', setor: 'Consultórios', andar: '', capacidade: 1, equipamentos: '', obs: ''
  });

  // Modal Reserva
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formReserva, setFormReserva] = useState({
    salaId: '', profissional: '', paciente: '', data: '', horaInicio: '', horaFim: '', duracao: ''
  });

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      let savedSalas = JSON.parse(localStorage.getItem(`${hid}_gestaoSalas`) || '[]');
      if (savedSalas.length === 0) {
        savedSalas = [
          {id:1,nome:"Consultório 1",tipo:"consultorio",setor:"Consultórios",andar:"1º Andar",capacidade:2,equipamentos:"Maca, Computador",status:"livre"},
          {id:2,nome:"Consultório 2",tipo:"consultorio",setor:"Consultórios",andar:"1º Andar",capacidade:1,equipamentos:"Maca",status:"livre"},
          {id:3,nome:"Sala de Triagem",tipo:"triagem",setor:"Emergência",andar:"Térreo",capacidade:3,equipamentos:"Maca, Monitor, Oxímetro",status:"livre"},
          {id:4,nome:"Sala de Reunião",tipo:"reuniao",setor:"Administração",andar:"2º Andar",capacidade:15,equipamentos:"Projetor, TV 65', Videoconferência",status:"livre"}
        ];
        localStorage.setItem(`${hid}_gestaoSalas`, JSON.stringify(savedSalas));
      }
      setSalas(savedSalas);

      const savedReservas = JSON.parse(localStorage.getItem(`${hid}_gestaoReservas`) || '[]');
      setReservas(savedReservas);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const saveSalas = (data: Sala[]) => {
    setSalas(data);
    localStorage.setItem(`${hospitalId}_gestaoSalas`, JSON.stringify(data));
  };

  const saveReservas = (data: Reserva[]) => {
    setReservas(data);
    localStorage.setItem(`${hospitalId}_gestaoReservas`, JSON.stringify(data));
  };

  const verificarTemposExpirados = () => {
    if (salas.length === 0) return;
    const agora = new Date();
    let alterouReserva = false;
    let alterouSala = false;
    
    let novasReservas = [...reservas];
    let novasSalas = [...salas];

    novasReservas = novasReservas.map(r => {
      if (r.status === "ativa" || r.status === "reservada") {
        const fim = new Date(r.data + 'T' + r.horaFim);
        if (agora >= fim) {
          alterouReserva = true;
          const salaIdx = novasSalas.findIndex(s => s.id === r.salaId);
          if (salaIdx !== -1 && (novasSalas[salaIdx].status === "ocupado" || novasSalas[salaIdx].status === "reservado")) {
            novasSalas[salaIdx] = { ...novasSalas[salaIdx], status: "livre" };
            alterouSala = true;
          }
          return { ...r, status: "finalizada", horaFimReal: new Date().toLocaleTimeString('pt-BR'), liberacaoAutomatica: true };
        }
      }
      return r;
    });

    novasReservas = novasReservas.map(r => {
      if (r.status === "reservada") {
        const inicio = new Date(r.data + 'T' + r.horaInicio);
        const fim = new Date(r.data + 'T' + r.horaFim);
        if (agora >= inicio && agora < fim) {
          alterouReserva = true;
          const salaIdx = novasSalas.findIndex(s => s.id === r.salaId);
          if (salaIdx !== -1 && novasSalas[salaIdx].status === "reservado") {
            novasSalas[salaIdx] = { ...novasSalas[salaIdx], status: "ocupado" };
            alterouSala = true;
          }
          return { ...r, status: "ativa" };
        }
      }
      return r;
    });

    if (alterouReserva) saveReservas(novasReservas);
    if (alterouSala) saveSalas(novasSalas);
  };

  useEffect(() => {
    if (loading) return;
    verificarTemposExpirados();
    const interval = setInterval(verificarTemposExpirados, 30000);
    return () => clearInterval(interval);
  }, [loading, salas, reservas]);

  const cadastrarSala = () => {
    if (!formSala.nome) { alert("⚠️ Digite o nome da sala!"); return; }
    const novaSala: Sala = {
      id: Date.now(),
      nome: formSala.nome.trim(),
      tipo: formSala.tipo,
      setor: formSala.setor,
      andar: formSala.andar.trim(),
      capacidade: Number(formSala.capacidade) || 1,
      equipamentos: formSala.equipamentos.trim(),
      status: "livre"
    };
    saveSalas([...salas, novaSala]);
    setFormSala({ nome: '', tipo: 'consultorio', setor: 'Consultórios', andar: '', capacidade: 1, equipamentos: '', obs: '' });
    setActiveTab('mapa');
    alert("✅ Sala cadastrada com sucesso!");
  };

  const abrirReserva = (salaId?: number) => {
    const u = localStorage.getItem('usuarioLogado');
    const usuario = u ? JSON.parse(u) : null;
    const agora = new Date();
    const horaInicio = agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    agora.setHours(agora.getHours() + 1);
    const horaFim = agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

    setFormReserva({
      salaId: salaId ? salaId.toString() : '',
      profissional: usuario?.nome || '',
      paciente: '',
      data: new Date().toISOString().split('T')[0],
      horaInicio,
      horaFim,
      duracao: ''
    });
    setIsModalOpen(true);
  };

  const calcularHoraFim = (duracaoStr: string, hrInicio: string) => {
    if (!duracaoStr) return;
    const duracao = parseInt(duracaoStr);
    if (!hrInicio) return;
    const [h, m] = hrInicio.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m) + duracao);
    setFormReserva(prev => ({ ...prev, duracao: duracaoStr, horaFim: d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) }));
  };

  const confirmarReserva = () => {
    const r: Reserva = {
      id: Date.now(),
      salaId: parseInt(formReserva.salaId),
      profissional: formReserva.profissional.trim(),
      paciente: formReserva.paciente.trim(),
      data: formReserva.data,
      horaInicio: formReserva.horaInicio,
      horaFim: formReserva.horaFim,
      status: "ativa"
    };
    
    if(!r.salaId || !r.profissional || !r.data || !r.horaInicio || !r.horaFim){
      alert("⚠️ Preencha todos os campos obrigatórios (*)!");
      return;
    }
    
    const salaIdx = salas.findIndex(s => s.id === r.salaId);
    if(salaIdx === -1) return;
    
    const agora = new Date();
    const dataReserva = new Date(r.data + 'T' + r.horaInicio);
    const diffMinutos = Math.floor((dataReserva.getTime() - agora.getTime()) / 60000);
    
    let novasSalas = [...salas];
    if(diffMinutos <= 0){
      novasSalas[salaIdx] = { ...novasSalas[salaIdx], status: "ocupado" };
      r.status = "ativa";
    } else {
      novasSalas[salaIdx] = { ...novasSalas[salaIdx], status: "reservado" };
      r.status = "reservada";
    }
    
    saveSalas(novasSalas);
    saveReservas([...reservas, r]);
    setIsModalOpen(false);
    
    const msg = diffMinutos <= 0 ?
      `🔴 Sala EM USO agora! Será liberada automaticamente às ${r.horaFim}` :
      `🟡 Sala RESERVADA para ${new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')} às ${r.horaInicio}`;
    alert("✅ " + msg);
  };

  const liberarSala = (id: number) => {
    let novasSalas = [...salas];
    let novasReservas = [...reservas];
    const salaIdx = novasSalas.findIndex(s => s.id === id);
    if (salaIdx !== -1) {
      novasSalas[salaIdx] = { ...novasSalas[salaIdx], status: "livre" };
      
      novasReservas = novasReservas.map(r => {
        if (r.salaId === id && (r.status === "ativa" || r.status === "reservada")) {
          return { ...r, status: "finalizada", horaFimReal: new Date().toLocaleTimeString('pt-BR') };
        }
        return r;
      });

      saveSalas(novasSalas);
      saveReservas(novasReservas);
      alert("✅ Sala liberada com sucesso!");
    }
  };

  const alterarStatusSala = (id: number, status: 'livre' | 'manutencao') => {
    let novasSalas = [...salas];
    const salaIdx = novasSalas.findIndex(s => s.id === id);
    if (salaIdx !== -1) {
      novasSalas[salaIdx] = { ...novasSalas[salaIdx], status };
      saveSalas(novasSalas);
      alert(`✅ Status alterado para: ${statusLabel[status]}`);
    }
  };

  const excluirSala = (id: number) => {
    if(!confirm("Tem certeza que deseja EXCLUIR esta sala permanentemente?")) return;
    saveSalas(salas.filter(s => s.id !== id));
    alert("🗑️ Sala excluída!");
  };

  // Stats
  const stats = {
    livres: salas.filter(s => s.status === 'livre').length,
    ocupadas: salas.filter(s => s.status === 'ocupado').length,
    reservadas: salas.filter(s => s.status === 'reservado').length,
    manutencao: salas.filter(s => s.status === 'manutencao').length,
    total: salas.length
  };

  // Filters
  let salasFiltradas = salas;
  if (filtroStatusSala !== 'todos') salasFiltradas = salasFiltradas.filter(s => s.status === filtroStatusSala);
  if (buscarSala) {
    const t = buscarSala.toLowerCase();
    salasFiltradas = salasFiltradas.filter(s => s.nome.toLowerCase().includes(t) || s.tipo.toLowerCase().includes(t) || s.setor.toLowerCase().includes(t));
  }

  let reservasFiltradas = [...reservas].reverse();
  if (buscarReserva) {
    const t = buscarReserva.toLowerCase();
    reservasFiltradas = reservasFiltradas.filter(r => r.profissional.toLowerCase().includes(t) || r.paciente.toLowerCase().includes(t));
  }

  if (loading) return <div>Carregando Gestão de Salas...</div>;

  return (
    <div className="conteudo">
      <div className="salas-container">
        
        <div className="banner-salas">
          <div>
            <h1><i className="las la-door-open"></i> Gestão de Salas & Consultórios</h1>
            <p>Cadastro, reserva e monitoramento em tempo real de salas, consultórios e espaços</p>
          </div>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <button className="btn btn-success" onClick={() => setActiveTab('cadastro')}><i className="las la-plus-circle"></i> Nova Sala</button>
            <button className="btn btn-primary" onClick={() => abrirReserva()}><i className="las la-calendar-plus"></i> Nova Reserva</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card livre"><div className="stat-icon"><i className="las la-check-circle"></i></div><div className="stat-valor">{stats.livres}</div><div className="stat-label">🟢 Livres</div></div>
          <div className="stat-card ocupado"><div className="stat-icon"><i className="las la-door-closed"></i></div><div className="stat-valor">{stats.ocupadas}</div><div className="stat-label">🔴 Em Uso</div></div>
          <div className="stat-card reservado"><div className="stat-icon"><i className="las la-clock"></i></div><div className="stat-valor">{stats.reservadas}</div><div className="stat-label">🟡 Reservadas</div></div>
          <div className="stat-card manutencao"><div className="stat-icon"><i className="las la-tools"></i></div><div className="stat-valor">{stats.manutencao}</div><div className="stat-label">⚫ Manutenção</div></div>
          <div className="stat-card"><div className="stat-icon"><i className="las la-door-open"></i></div><div className="stat-valor">{stats.total}</div><div className="stat-label">Total de Salas</div></div>
        </div>

        <div className="legenda-salas">
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#22c55e'}}></div> 🟢 Livre - Disponível para uso</div>
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#f59e0b'}}></div> 🟡 Reservada - Agendada para horário futuro</div>
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#dc2626'}}></div> 🔴 Em Uso - Ocupada neste momento</div>
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#6b7280'}}></div> ⚫ Manutenção - Indisponível temporariamente</div>
        </div>

        <div className="tabs-salas">
          <button className={`tab-btn ${activeTab === 'mapa' ? 'ativo' : ''}`} onClick={() => setActiveTab('mapa')}><i className="las la-th-large"></i> Mapa de Salas</button>
          <button className={`tab-btn ${activeTab === 'cadastro' ? 'ativo' : ''}`} onClick={() => setActiveTab('cadastro')}><i className="las la-plus-circle"></i> Cadastrar Sala</button>
          <button className={`tab-btn ${activeTab === 'reservas' ? 'ativo' : ''}`} onClick={() => setActiveTab('reservas')}><i className="las la-calendar-alt"></i> Reservas</button>
          <button className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}><i className="las la-history"></i> Histórico</button>
        </div>

        {activeTab === 'mapa' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar sala por nome, tipo ou setor..." value={buscarSala} onChange={e => setBuscarSala(e.target.value)} />
              <select value={filtroStatusSala} onChange={e => setFiltroStatusSala(e.target.value)}>
                <option value="todos">Todos os Status</option>
                <option value="livre">🟢 Livres</option>
                <option value="reservado">🟡 Reservadas</option>
                <option value="ocupado">🔴 Em Uso</option>
                <option value="manutencao">⚫ Manutenção</option>
              </select>
            </div>
            <div className="mapa-salas">
              {salasFiltradas.length === 0 ? (
                <div style={{textAlign:'center', padding:'50px', color:'#94a3b8', gridColumn:'1/-1'}}><i className="las la-door-open" style={{fontSize:'64px', opacity:0.3}}></i><p>Nenhuma sala encontrada</p></div>
              ) : (
                salasFiltradas.map(s => {
                  const resAtiva = reservas.find(r => r.salaId === s.id && (r.status === "ativa" || r.status === "reservada"));
                  let tempoRestante = '';
                  let classeUrgente = '';
                  
                  if(resAtiva && resAtiva.horaFim){
                      const agora = new Date();
                      const fim = new Date(resAtiva.data + 'T' + resAtiva.horaFim);
                      const diff = Math.floor((fim.getTime() - agora.getTime()) / 60000);
                      
                      if(diff > 0){
                          const horas = Math.floor(diff / 60);
                          const mins = diff % 60;
                          tempoRestante = horas > 0 ? `${horas}h ${mins}min restantes` : `${mins} min restantes`;
                          if(diff <= 5) classeUrgente = 'urgente';
                      } else if(diff === 0){
                          tempoRestante = 'Encerrando agora...';
                          classeUrgente = 'urgente';
                      } else {
                          tempoRestante = '⏰ Tempo esgotado! Liberando...';
                          classeUrgente = 'urgente';
                      }
                  }
                  
                  const resFutura = reservas.find(r => r.salaId === s.id && r.status === "reservada");

                  return (
                    <div key={s.id} className={`sala-card ${s.status}`}>
                      <div className="sala-numero"><span>{s.nome}</span><span className="sala-status">{statusLabel[s.status]}</span></div>
                      <div className="sala-info">
                          <p><i className="las la-tag"></i> {tiposSala[s.tipo] || s.tipo}</p>
                          <p><i className="las la-map-marker"></i> {s.setor}{s.andar ? ' - ' + s.andar : ''}</p>
                          <p><i className="las la-users"></i> Capacidade: {s.capacidade} pessoa(s)</p>
                          {s.equipamentos && <p><i className="las la-tools"></i> {s.equipamentos}</p>}
                          {resAtiva && (
                            <>
                              <p><i className="las la-user"></i> <strong>{resAtiva.profissional}</strong>{resAtiva.paciente ? ' | ' + resAtiva.paciente : ''}</p>
                              <p className={`tempo-restante ${classeUrgente}`}><i className="las la-hourglass-half"></i> {tempoRestante}</p>
                            </>
                          )}
                          {!resAtiva && resFutura && (
                            <p><i className="las la-clock"></i> <strong>Reservado para:</strong> {new Date(resFutura.data+'T00:00:00').toLocaleDateString('pt-BR')} às {resFutura.horaInicio}</p>
                          )}
                      </div>
                      <div className="sala-acoes">
                          {s.status === 'livre' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => abrirReserva(s.id)}><i className="las la-calendar-plus"></i> Reservar</button>
                              <button className="btn btn-warning btn-sm" onClick={() => alterarStatusSala(s.id, 'manutencao')}><i className="las la-tools"></i> Manutenção</button>
                            </>
                          )}
                          {s.status === 'reservado' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => abrirReserva(s.id)}><i className="las la-calendar-plus"></i> Reservar</button>
                              <button className="btn btn-warning btn-sm" onClick={() => alterarStatusSala(s.id, 'manutencao')}><i className="las la-tools"></i> Manutenção</button>
                            </>
                          )}
                          {(s.status === 'ocupado' || s.status === 'reservado') && (
                            <button className="btn btn-success btn-sm" onClick={() => liberarSala(s.id)}><i className="las la-check-circle"></i> Liberar Agora</button>
                          )}
                          {s.status === 'manutencao' && (
                            <button className="btn btn-success btn-sm" onClick={() => alterarStatusSala(s.id, 'livre')}><i className="las la-check"></i> Liberar</button>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => excluirSala(s.id)}><i className="las la-trash"></i></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'cadastro' && (
          <div className="form-panel">
            <h3><i className="las la-plus-circle"></i> Cadastrar Nova Sala</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Nome da Sala *</label><input type="text" placeholder="Ex: Consultório 3" value={formSala.nome} onChange={e => setFormSala({...formSala, nome: e.target.value})} /></div>
              <div className="form-grupo"><label>Tipo *</label><select value={formSala.tipo} onChange={e => setFormSala({...formSala, tipo: e.target.value})}>
                <option value="consultorio">🏥 Consultório</option><option value="cirurgica">🔪 Sala Cirúrgica</option>
                <option value="exame">🔬 Sala de Exames</option><option value="reuniao">💼 Sala de Reunião</option>
                <option value="triagem">🩺 Sala de Triagem</option><option value="observacao">🛏️ Sala de Observação</option>
                <option value="procedimento">💉 Sala de Procedimentos</option><option value="aula">📚 Sala de Aula</option>
                <option value="outro">📋 Outro</option>
              </select></div>
              <div className="form-grupo"><label>Setor *</label><select value={formSala.setor} onChange={e => setFormSala({...formSala, setor: e.target.value})}>
                <option>Consultórios</option><option>Centro Cirúrgico</option><option>Emergência</option>
                <option>UTI</option><option>Enfermaria</option><option>Ambulatório</option>
                <option>Administração</option><option>Outro</option>
              </select></div>
              <div className="form-grupo"><label>Andar</label><input type="text" placeholder="Térreo, 1º Andar..." value={formSala.andar} onChange={e => setFormSala({...formSala, andar: e.target.value})} /></div>
              <div className="form-grupo"><label>Capacidade</label><input type="number" min="1" value={formSala.capacidade} onChange={e => setFormSala({...formSala, capacidade: parseInt(e.target.value)})} /></div>
              <div className="form-grupo"><label>Equipamentos</label><input type="text" placeholder="Maca, Computador, Projetor..." value={formSala.equipamentos} onChange={e => setFormSala({...formSala, equipamentos: e.target.value})} /></div>
              <div className="form-grupo full"><label>Observações</label><textarea rows={2} value={formSala.obs} onChange={e => setFormSala({...formSala, obs: e.target.value})}></textarea></div>
            </div>
            <button className="btn btn-success" onClick={cadastrarSala} style={{width:'100%', marginTop:'15px', justifyContent:'center', padding:'14px'}}><i className="las la-save"></i> Cadastrar Sala</button>
          </div>
        )}

        {activeTab === 'reservas' && (
          <div>
            <div className="search-box"><input type="text" placeholder="Buscar por sala, profissional ou paciente..." value={buscarReserva} onChange={e => setBuscarReserva(e.target.value)} /></div>
            <div style={{background:'white', borderRadius:'20px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)'}}>
              <table className="tabela-salas"><thead><tr><th>Sala</th><th>Profissional</th><th>Paciente/Evento</th><th>Data</th><th>Horário</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {reservasFiltradas.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhuma reserva encontrada</td></tr>
                ) : (
                  reservasFiltradas.map(r => {
                    const sala = salas.find(s => s.id === r.salaId);
                    const stB = r.status === 'ativa' ? 'badge-ocupado' : r.status === 'reservada' ? 'badge-reservado' : 'badge-livre';
                    const stL = r.status === 'ativa' ? '🔴 Em Uso' : r.status === 'reservada' ? '🟡 Reservada' : '✅ Finalizada';
                    return (
                      <tr key={r.id}>
                        <td><strong>{sala ? sala.nome : '—'}</strong></td>
                        <td>{r.profissional}</td>
                        <td>{r.paciente || '—'}</td>
                        <td>{new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{r.horaInicio} - {r.horaFim}{r.horaFimReal ? ` (Real: ${r.horaFimReal})` : ''}</td>
                        <td>
                          <span className={`badge ${stB}`}>{stL}</span>
                          {r.liberacaoAutomatica && <><br /><small style={{color:'#64748b'}}>Auto-liberada</small></>}
                        </td>
                        <td>
                          {r.status === 'ativa' || r.status === 'reservada' ? (
                            <button className="btn btn-success btn-xs" onClick={() => liberarSala(r.salaId)}><i className="las la-check"></i> Liberar</button>
                          ) : <span style={{color:'#94a3b8', fontSize:'11px'}}>—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div style={{background:'white', borderRadius:'20px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)'}}>
            <table className="tabela-salas"><thead><tr><th>Data</th><th>Sala</th><th>Profissional</th><th>Status</th><th>Detalhes</th></tr></thead>
            <tbody>
              {reservas.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum histórico</td></tr>
              ) : (
                [...reservas].reverse().map(r => {
                  const sala = salas.find(s => s.id === r.salaId);
                  const stB = r.status === 'ativa' ? 'badge-ocupado' : r.status === 'reservada' ? 'badge-reservado' : 'badge-livre';
                  const stL = r.status === 'ativa' ? '🔴 Em Uso' : r.status === 'reservada' ? '🟡 Reservada' : '✅ Finalizada';
                  return (
                    <tr key={r.id}>
                        <td>{new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{sala ? sala.nome : '—'}</td>
                        <td>{r.profissional}</td>
                        <td><span className={`badge ${stB}`}>{stL}</span></td>
                        <td>{r.horaInicio} - {r.horaFim} | {r.paciente || 'N/I'}{r.liberacaoAutomatica ? ' | <span style="color:#64748b;">Auto-liberada</span>' : ''}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="modal-overlay show">
          <div className="modal-box">
            <h3><i className="las la-calendar-plus"></i> Reservar Sala</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Sala *</label>
                <select value={formReserva.salaId} onChange={e => setFormReserva({...formReserva, salaId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {salas.filter(s => s.status === "livre").map(s => <option key={s.id} value={s.id}>{s.nome} ({s.setor})</option>)}
                </select>
              </div>
              <div className="form-grupo"><label>Profissional *</label><input type="text" value={formReserva.profissional} onChange={e => setFormReserva({...formReserva, profissional: e.target.value})} /></div>
              <div className="form-grupo"><label>Paciente / Evento</label><input type="text" value={formReserva.paciente} onChange={e => setFormReserva({...formReserva, paciente: e.target.value})} /></div>
              <div className="form-grupo"><label>Data *</label><input type="date" value={formReserva.data} onChange={e => setFormReserva({...formReserva, data: e.target.value})} /></div>
              <div className="form-grupo"><label>Horário Início *</label><input type="time" value={formReserva.horaInicio} onChange={e => setFormReserva({...formReserva, horaInicio: e.target.value})} /></div>
              <div className="form-grupo"><label>Horário Término *</label><input type="time" value={formReserva.horaFim} onChange={e => setFormReserva({...formReserva, horaFim: e.target.value})} /></div>
              <div className="form-grupo">
                <label>Duração (atalho)</label>
                <select value={formReserva.duracao} onChange={e => calcularHoraFim(e.target.value, formReserva.horaInicio)}>
                  <option value="">Personalizado</option><option value="15">15 minutos</option><option value="30">30 minutos</option>
                  <option value="45">45 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option>
                </select>
              </div>
            </div>
            <button className="btn btn-success" onClick={confirmarReserva} style={{width:'100%', marginTop:'15px', justifyContent:'center'}}><i className="las la-save"></i> Confirmar</button>
            <button className="btn btn-danger" onClick={() => setIsModalOpen(false)} style={{width:'100%', marginTop:'8px', justifyContent:'center'}}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}
