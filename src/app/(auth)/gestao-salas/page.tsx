'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import './gestao-salas.css';

function dataLocalISO(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

interface Sala {
  id: string;
  nome: string;
  tipo: string | null;
  setor: string | null;
  andar?: string;
  capacidade: number;
  equipamentos?: string;
  obs?: string;
  status: string; // LIVRE, OCUPADO, RESERVADO, MANUTENCAO
}

interface Reserva {
  id: string;
  salaId: string;
  profissional: string;
  paciente?: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string; // ATIVA, RESERVADA, FINALIZADA, CANCELADA
}

const tiposSala: Record<string, string> = {
  consultorio: " Consultório",
  cirurgica: " Sala Cirúrgica",
  exame: " Sala de Exames",
  reuniao: " Sala de Reunião",
  triagem: " Sala de Triagem",
  observacao: " Sala de Observação",
  procedimento: " Sala de Procedimentos",
  aula: " Sala de Aula",
  outro: " Outro"
};

const statusLabel: Record<string, string> = {
  LIVRE: " Livre",
  OCUPADO: " Em Uso",
  RESERVADO: " Reservada",
  MANUTENCAO: " Manutenção"
};

export default function GestaoSalasPage() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'cadastro' | 'reservas' | 'historico'>('mapa');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

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
  const [isSaving, setIsSaving] = useState(false);
  const [formReserva, setFormReserva] = useState({
    salaId: '', profissional: '', paciente: '', data: '', horaInicio: '', horaFim: '', duracao: ''
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resSalas, resReservas] = await Promise.all([
        fetch('/api/salas', { cache: 'no-store' }),
        fetch('/api/salas/reservas', { cache: 'no-store' })
      ]);
      if (!resSalas.ok || !resReservas.ok) {
        throw new Error('Não foi possível carregar salas e reservas. Atualize a tela e tente novamente.');
      }
      const [salasData, reservasData] = await Promise.all([resSalas.json(), resReservas.json()]);
      if (!Array.isArray(salasData) || !Array.isArray(reservasData)) {
        throw new Error('A resposta de salas e reservas está inválida.');
      }
      setSalas(salasData);
      setReservas(reservasData);
      setErroCarga('');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Erro ao carregar salas e reservas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const cadastrarSala = async () => {
    if (!formSala.nome) { alert(" Digite o nome da sala!"); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/salas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formSala.nome.trim(),
          tipo: formSala.tipo,
          setor: formSala.setor,
          andar: formSala.andar.trim(),
          capacidade: Number(formSala.capacidade) || 1,
          equipamentos: formSala.equipamentos.trim(),
          obs: formSala.obs.trim(),
          status: "LIVRE"
        })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao cadastrar sala");

      setFormSala({ nome: '', tipo: 'consultorio', setor: 'Consultórios', andar: '', capacidade: 1, equipamentos: '', obs: '' });
      setActiveTab('mapa');
      alert(" Sala cadastrada com sucesso!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const abrirReserva = (salaId?: string) => {
    const u = JSON.stringify(getSessionUser());
    const usuario = u ? JSON.parse(u) : null;
    const agora = new Date();
    const horaInicio = agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    agora.setHours(agora.getHours() + 1);
    const horaFim = agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

    setFormReserva({
      salaId: salaId || '',
      profissional: usuario?.nome || '',
      paciente: '',
      data: dataLocalISO(),
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

  const confirmarReserva = async () => {
    if(!formReserva.salaId || !formReserva.profissional || !formReserva.data || !formReserva.horaInicio || !formReserva.horaFim){
      alert(" Preencha todos os campos obrigatórios (*)!");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/salas/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salaId: formReserva.salaId,
          profissional: formReserva.profissional.trim(),
          paciente: formReserva.paciente.trim(),
          data: formReserva.data,
          horaInicio: formReserva.horaInicio,
          horaFim: formReserva.horaFim
        })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao criar reserva");

      setIsModalOpen(false);
      alert(" Reserva confirmada com sucesso!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const encerrarReserva = async (reservaId: string, status: 'FINALIZADA' | 'CANCELADA') => {
    try {
      const res = await fetch(`/api/salas/reservas/${reservaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao atualizar reserva");
      alert(status === 'FINALIZADA' ? " Sala liberada com sucesso!" : " Reserva cancelada com sucesso!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const alterarStatusSala = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/salas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao atualizar status");
      alert(` Status alterado para: ${statusLabel[status]}`);
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Stats
  const stats = {
    livres: salas.filter(s => s.status === 'LIVRE').length,
    ocupadas: salas.filter(s => s.status === 'OCUPADO').length,
    reservadas: salas.filter(s => s.status === 'RESERVADO').length,
    manutencao: salas.filter(s => s.status === 'MANUTENCAO').length,
    total: salas.length
  };

  // Filters
  let salasFiltradas = salas;
  if (filtroStatusSala !== 'todos') salasFiltradas = salasFiltradas.filter(s => s.status === filtroStatusSala);
  if (buscarSala.trim()) {
    const t = buscarSala.trim().toLocaleLowerCase('pt-BR');
    salasFiltradas = salasFiltradas.filter(s => s.nome.toLocaleLowerCase('pt-BR').includes(t) || (s.tipo || '').toLocaleLowerCase('pt-BR').includes(t) || (s.setor || '').toLocaleLowerCase('pt-BR').includes(t));
  }

  let reservasFiltradas = [...reservas];
  if (buscarReserva) {
    const t = buscarReserva.toLowerCase();
    reservasFiltradas = reservasFiltradas.filter(r => r.profissional.toLowerCase().includes(t) || (r.paciente || '').toLowerCase().includes(t));
  }

  if (loading) return <div className="salas-loading" role="status" aria-live="polite">Carregando Gestão de Salas…</div>;

  return (
    <div className="conteudo">
      <div className="salas-container">
        
        <div className="banner-salas">
          <div>
            <h1><i className="las la-door-open"></i> Gestão de Salas & Consultórios</h1>
            <p>Cadastro, reserva e monitoramento em tempo real de salas e espaços</p>
          </div>
          <div className="banner-salas-acoes">
            <button className="btn btn-success" onClick={() => setActiveTab('cadastro')}><i className="las la-plus-circle"></i> Nova Sala</button>
            <button className="btn btn-primary" onClick={() => abrirReserva()} disabled={!!erroCarga} title={erroCarga ? 'Carregue os dados antes de criar uma reserva' : undefined}><i aria-hidden="true" className="las la-calendar-plus"></i> Nova Reserva</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card livre"><div className="stat-icon" aria-hidden="true"><i className="las la-check-circle"></i></div><div className="stat-valor">{erroCarga ? '—' : stats.livres}</div><div className="stat-label">Livres</div></div>
          <div className="stat-card ocupado"><div className="stat-icon" aria-hidden="true"><i className="las la-door-closed"></i></div><div className="stat-valor">{erroCarga ? '—' : stats.ocupadas}</div><div className="stat-label">Em Uso</div></div>
          <div className="stat-card reservado"><div className="stat-icon" aria-hidden="true"><i className="las la-clock"></i></div><div className="stat-valor">{erroCarga ? '—' : stats.reservadas}</div><div className="stat-label">Reservadas</div></div>
          <div className="stat-card manutencao"><div className="stat-icon" aria-hidden="true"><i className="las la-tools"></i></div><div className="stat-valor">{erroCarga ? '—' : stats.manutencao}</div><div className="stat-label">Manutenção</div></div>
          <div className="stat-card"><div className="stat-icon" aria-hidden="true"><i className="las la-door-open"></i></div><div className="stat-valor">{erroCarga ? '—' : stats.total}</div><div className="stat-label">Total de Salas</div></div>
        </div>

        {erroCarga && (
          <div className="salas-erro" role="alert">
            <span>{erroCarga}</span>
            <button className="btn btn-primary btn-sm" onClick={carregarDados}>Tentar novamente</button>
          </div>
        )}

        <div className="legenda-salas">
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#22c55e'}}></div>  Livre - Disponível para uso</div>
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#f59e0b'}}></div>  Reservada - Agendada para horário futuro</div>
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#dc2626'}}></div>  Em Uso - Ocupada neste momento</div>
          <div className="legenda-item"><div className="legenda-cor" style={{background:'#6b7280'}}></div>  Manutenção - Indisponível temporariamente</div>
        </div>

        <div className="tabs-salas">
          <button type="button" aria-pressed={activeTab === 'mapa'} className={`tab-btn ${activeTab === 'mapa' ? 'ativo' : ''}`} onClick={() => setActiveTab('mapa')}><i aria-hidden="true" className="las la-th-large"></i> Mapa de Salas</button>
          <button type="button" aria-pressed={activeTab === 'cadastro'} className={`tab-btn ${activeTab === 'cadastro' ? 'ativo' : ''}`} onClick={() => setActiveTab('cadastro')}><i aria-hidden="true" className="las la-plus-circle"></i> Cadastrar Sala</button>
          <button type="button" aria-pressed={activeTab === 'reservas'} className={`tab-btn ${activeTab === 'reservas' ? 'ativo' : ''}`} onClick={() => setActiveTab('reservas')}><i aria-hidden="true" className="las la-calendar-alt"></i> Reservas</button>
          <button type="button" aria-pressed={activeTab === 'historico'} className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}><i aria-hidden="true" className="las la-history"></i> Histórico</button>
        </div>

        {activeTab === 'mapa' && (
          <div>
            <div className="search-box">
              <input aria-label="Buscar sala por nome, tipo ou setor" type="search" placeholder="Buscar sala por nome, tipo ou setor..." value={buscarSala} onChange={e => setBuscarSala(e.target.value)} />
              <select aria-label="Filtrar salas por status" value={filtroStatusSala} onChange={e => setFiltroStatusSala(e.target.value)}>
                <option value="todos">Todos os Status</option>
                <option value="LIVRE"> Livres</option>
                <option value="RESERVADO"> Reservadas</option>
                <option value="OCUPADO"> Em Uso</option>
                <option value="MANUTENCAO"> Manutenção</option>
              </select>
            </div>
            <div className="mapa-salas">
              {erroCarga ? null : salasFiltradas.length === 0 ? (
                <div style={{textAlign:'center', padding:'50px', color:'#94a3b8', gridColumn:'1/-1'}}><i className="las la-door-open" style={{fontSize:'64px', opacity:0.3}}></i><p>Nenhuma sala encontrada</p></div>
              ) : (
                salasFiltradas.map(s => {
                  const resAtiva = reservas.find(r => r.salaId === s.id && r.status === "ATIVA");
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
                          tempoRestante = 'Prazo da reserva encerrado';
                          classeUrgente = 'urgente';
                      }
                  }

                  const salaStatusCss = s.status.toLowerCase();

                  return (
                    <div key={s.id} className={`sala-card ${salaStatusCss}`}>
                      <div className="sala-numero"><span>{s.nome}</span><span className="sala-status">{statusLabel[s.status]}</span></div>
                      <div className="sala-info">
                          <p><i aria-hidden="true" className="las la-tag"></i> {tiposSala[s.tipo || ''] || s.tipo || 'Tipo não informado'}</p>
                          <p><i aria-hidden="true" className="las la-map-marker"></i> {s.setor || 'Setor não informado'}{s.andar ? ' - ' + s.andar : ''}</p>
                          <p><i className="las la-users"></i> Capacidade: {s.capacidade} pessoa(s)</p>
                          {s.equipamentos && <p><i className="las la-tools"></i> {s.equipamentos}</p>}
                          {s.obs && <p><i className="las la-info-circle"></i> {s.obs}</p>}
                          {resAtiva && (
                            <>
                              <p><i className="las la-user"></i> <strong>{resAtiva.profissional}</strong>{resAtiva.paciente ? ' | ' + resAtiva.paciente : ''}</p>
                              <p className={`tempo-restante ${classeUrgente}`}><i className="las la-hourglass-half"></i> {tempoRestante}</p>
                            </>
                          )}
                      </div>
                      <div className="sala-acoes">
                          {s.status === 'LIVRE' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => abrirReserva(s.id)}><i className="las la-calendar-plus"></i> Reservar</button>
                              <button className="btn btn-warning btn-sm" onClick={() => alterarStatusSala(s.id, 'MANUTENCAO')}><i className="las la-tools"></i> Manutenção</button>
                            </>
                          )}
                          {s.status === 'RESERVADO' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => abrirReserva(s.id)}><i className="las la-calendar-plus"></i> Reservar</button>
                              <button className="btn btn-warning btn-sm" onClick={() => alterarStatusSala(s.id, 'MANUTENCAO')}><i className="las la-tools"></i> Manutenção</button>
                            </>
                          )}
                          {s.status === 'OCUPADO' && resAtiva && (
                            <button className="btn btn-success btn-sm" onClick={() => encerrarReserva(resAtiva.id, 'FINALIZADA')}><i className="las la-check-circle"></i> Liberar Agora</button>
                          )}
                          {s.status === 'MANUTENCAO' && (
                            <button className="btn btn-success btn-sm" onClick={() => alterarStatusSala(s.id, 'LIVRE')}><i className="las la-check"></i> Liberar</button>
                          )}
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
              <div className="form-grupo"><label htmlFor="sala-nome">Nome da Sala *</label><input id="sala-nome" type="text" placeholder="Ex: Consultório 3" value={formSala.nome} onChange={e => setFormSala({...formSala, nome: e.target.value})} /></div>
              <div className="form-grupo"><label htmlFor="sala-tipo">Tipo *</label><select id="sala-tipo" value={formSala.tipo} onChange={e => setFormSala({...formSala, tipo: e.target.value})}>
                <option value="consultorio"> Consultório</option><option value="cirurgica"> Sala Cirúrgica</option>
                <option value="exame"> Sala de Exames</option><option value="reuniao"> Sala de Reunião</option>
                <option value="triagem"> Sala de Triagem</option><option value="observacao"> Sala de Observação</option>
                <option value="procedimento"> Sala de Procedimentos</option><option value="aula"> Sala de Aula</option>
                <option value="outro"> Outro</option>
              </select></div>
              <div className="form-grupo"><label htmlFor="sala-setor">Setor *</label><select id="sala-setor" value={formSala.setor} onChange={e => setFormSala({...formSala, setor: e.target.value})}>
                <option>Consultórios</option><option>Centro Cirúrgico</option><option>Emergência</option>
                <option>UTI</option><option>Enfermaria</option><option>Ambulatório</option>
                <option>Administração</option><option>Outro</option>
              </select></div>
              <div className="form-grupo"><label htmlFor="sala-andar">Andar</label><input id="sala-andar" type="text" placeholder="Térreo, 1º Andar..." value={formSala.andar} onChange={e => setFormSala({...formSala, andar: e.target.value})} /></div>
              <div className="form-grupo"><label htmlFor="sala-capacidade">Capacidade</label><input id="sala-capacidade" type="number" min="1" value={formSala.capacidade} onChange={e => setFormSala({...formSala, capacidade: parseInt(e.target.value) || 1})} /></div>
              <div className="form-grupo"><label htmlFor="sala-equipamentos">Equipamentos</label><input id="sala-equipamentos" type="text" placeholder="Maca, Computador, Projetor..." value={formSala.equipamentos} onChange={e => setFormSala({...formSala, equipamentos: e.target.value})} /></div>
              <div className="form-grupo full"><label htmlFor="sala-obs">Observações</label><textarea id="sala-obs" rows={2} value={formSala.obs} onChange={e => setFormSala({...formSala, obs: e.target.value})}></textarea></div>
            </div>
            <button className="btn btn-success" onClick={cadastrarSala} disabled={isSaving} style={{width:'100%', marginTop:'15px', justifyContent:'center', padding:'14px'}}><i className="las la-save"></i> {isSaving ? 'Cadastrando...' : 'Cadastrar Sala'}</button>
          </div>
        )}

        {activeTab === 'reservas' && (
          <div>
            <div className="search-box"><input aria-label="Buscar reserva por profissional ou paciente" type="search" placeholder="Buscar por sala, profissional ou paciente..." value={buscarReserva} onChange={e => setBuscarReserva(e.target.value)} /></div>
            <div className="tabela-salas-wrapper">
              <table className="tabela-salas"><thead><tr><th>Sala</th><th>Profissional</th><th>Paciente/Evento</th><th>Data</th><th>Horário</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {erroCarga ? (
                  <tr><td colSpan={7} role="status" style={{textAlign:'center', padding:'30px', color:'#64748b'}}>Reservas indisponíveis enquanto os dados não carregam.</td></tr>
                ) : reservasFiltradas.filter(r => r.status === 'ATIVA' || r.status === 'RESERVADA').length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhuma reserva ativa encontrada</td></tr>
                ) : (
                  reservasFiltradas.filter(r => r.status === 'ATIVA' || r.status === 'RESERVADA').map(r => {
                    const sala = salas.find(s => s.id === r.salaId);
                    const stB = r.status === 'ATIVA' ? 'badge-ocupado' : 'badge-reservado';
                    const stL = r.status === 'ATIVA' ? ' Em Uso' : ' Reservada';
                    return (
                      <tr key={r.id}>
                        <td><strong>{sala ? sala.nome : '—'}</strong></td>
                        <td>{r.profissional}</td>
                        <td>{r.paciente || '—'}</td>
                        <td>{new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{r.horaInicio} - {r.horaFim}</td>
                        <td><span className={`badge ${stB}`}>{stL}</span></td>
                        <td>
                          {r.status === 'ATIVA' || r.status === 'RESERVADA' ? (
                            <button className="btn btn-success btn-xs" onClick={() => encerrarReserva(r.id, r.status === 'ATIVA' ? 'FINALIZADA' : 'CANCELADA')}><i className={`las ${r.status === 'ATIVA' ? 'la-check' : 'la-times'}`}></i> {r.status === 'ATIVA' ? 'Finalizar' : 'Cancelar'}</button>
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
          <div className="tabela-salas-wrapper">
            <table className="tabela-salas"><thead><tr><th>Data</th><th>Sala</th><th>Profissional</th><th>Status</th><th>Detalhes</th></tr></thead>
            <tbody>
              {erroCarga ? (
                <tr><td colSpan={5} role="status" style={{textAlign:'center', padding:'30px', color:'#64748b'}}>Histórico indisponível enquanto os dados não carregam.</td></tr>
              ) : reservas.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum histórico</td></tr>
              ) : (
                reservas.map(r => {
                  const sala = salas.find(s => s.id === r.salaId);
                  const stB = r.status === 'ATIVA' ? 'badge-ocupado' : r.status === 'RESERVADA' ? 'badge-reservado' : 'badge-livre';
                  const stL = r.status === 'ATIVA' ? ' Em Uso' : r.status === 'RESERVADA' ? ' Reservada' : (r.status === 'FINALIZADA' ? ' Finalizada' : ' Cancelada');
                  return (
                    <tr key={r.id}>
                        <td>{new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{sala ? sala.nome : '—'}</td>
                        <td>{r.profissional}</td>
                        <td><span className={`badge ${stB}`}>{stL}</span></td>
                        <td>{r.horaInicio} - {r.horaFim} | {r.paciente || 'N/I'}</td>
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
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="reserva-sala-titulo">
            <h3 id="reserva-sala-titulo"><i aria-hidden="true" className="las la-calendar-plus"></i> Reservar Sala</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label htmlFor="reserva-sala">Sala *</label>
                <select id="reserva-sala" value={formReserva.salaId} onChange={e => setFormReserva({...formReserva, salaId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {salas.filter(s => s.status === 'LIVRE' || s.status === 'RESERVADO' || s.id === formReserva.salaId).map(s => <option key={s.id} value={s.id}>{s.nome} ({s.setor})</option>)}
                </select>
              </div>
              <div className="form-grupo"><label htmlFor="reserva-profissional">Profissional *</label><input id="reserva-profissional" type="text" value={formReserva.profissional} onChange={e => setFormReserva({...formReserva, profissional: e.target.value})} /></div>
              <div className="form-grupo"><label htmlFor="reserva-paciente">Paciente / Evento</label><input id="reserva-paciente" type="text" value={formReserva.paciente} onChange={e => setFormReserva({...formReserva, paciente: e.target.value})} /></div>
              <div className="form-grupo"><label htmlFor="reserva-data">Data *</label><input id="reserva-data" type="date" value={formReserva.data} onChange={e => setFormReserva({...formReserva, data: e.target.value})} /></div>
              <div className="form-grupo"><label htmlFor="reserva-inicio">Horário Início *</label><input id="reserva-inicio" type="time" value={formReserva.horaInicio} onChange={e => setFormReserva({...formReserva, horaInicio: e.target.value})} /></div>
              <div className="form-grupo"><label htmlFor="reserva-fim">Horário Término *</label><input id="reserva-fim" type="time" value={formReserva.horaFim} onChange={e => setFormReserva({...formReserva, horaFim: e.target.value})} /></div>
              <div className="form-grupo">
                <label htmlFor="reserva-duracao">Duração (atalho)</label>
                <select id="reserva-duracao" value={formReserva.duracao} onChange={e => calcularHoraFim(e.target.value, formReserva.horaInicio)}>
                  <option value="">Personalizado</option><option value="15">15 minutos</option><option value="30">30 minutos</option>
                  <option value="45">45 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option>
                </select>
              </div>
            </div>
            <button className="btn btn-success" onClick={confirmarReserva} disabled={isSaving} style={{width:'100%', marginTop:'15px', justifyContent:'center'}}><i className="las la-save"></i> {isSaving ? 'Confirmando...' : 'Confirmar'}</button>
            <button className="btn btn-danger" onClick={() => setIsModalOpen(false)} disabled={isSaving} style={{width:'100%', marginTop:'8px', justifyContent:'center'}}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}
