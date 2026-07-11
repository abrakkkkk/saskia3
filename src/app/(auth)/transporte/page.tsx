'use client';
import { useState, useEffect } from 'react';
import './transporte.css';

interface Transporte {
  id: number;
  paciente: string;
  origem: string;
  destino: string;
  tipo: string;
  solicitante: string;
  data: string;
  status: string;
}

export default function TransportePage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [activeTab, setActiveTab] = useState<'solicitar'|'lista'>('solicitar');
  
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);

  // Form State
  const [transpPaciente, setTranspPaciente] = useState('');
  const [transpOrigem, setTranspOrigem] = useState('Enfermaria');
  const [transpDestino, setTranspDestino] = useState('Centro de Imagem');
  const [transpTipo, setTranspTipo] = useState('Interno (Cadeira de Rodas)');
  const [transpSolicitante, setTranspSolicitante] = useState('');
  const [transpData, setTranspData] = useState('');

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      const storedTransp = JSON.parse(localStorage.getItem(`${hid}_transpSolicitacoes`) || '[]');
      setTransportes(storedTransp);

      const storedPac = JSON.parse(localStorage.getItem(`${hid}_pacientes`) || '[]');
      setPacientes(storedPac);

      setTranspData(new Date().toISOString().slice(0, 16));
    } catch(e) {}
  }, []);

  const saveTransportes = (data: Transporte[]) => {
    setTransportes(data);
    localStorage.setItem(`${hospitalId}_transpSolicitacoes`, JSON.stringify(data));
  };

  const solicitarTransporte = () => {
    if (!transpPaciente) {
      alert("⚠️ Selecione o paciente!");
      return;
    }

    const novoTransp: Transporte = {
      id: Date.now(),
      paciente: transpPaciente,
      origem: transpOrigem,
      destino: transpDestino,
      tipo: transpTipo,
      solicitante: transpSolicitante.trim(),
      data: transpData || new Date().toISOString().slice(0, 16),
      status: "Pendente"
    };

    saveTransportes([...transportes, novoTransp]);
    setTranspSolicitante('');
    alert("✅ Transporte solicitado!");
    setActiveTab('lista');
  };

  const concluirTransporte = (id: number) => {
    if(confirm("Deseja marcar este transporte como Concluído?")) {
      const novos = transportes.map(t => {
        if (t.id === id) return { ...t, status: "Concluído" };
        return t;
      });
      saveTransportes(novos);
    }
  };

  const hojeStr = new Date().toISOString().split('T')[0];
  const statTotal = transportes.filter(t => t.data.startsWith(hojeStr)).length;
  const statPendentes = transportes.filter(t => t.status === "Pendente").length;

  return (
    <div className="conteudo">
      <div className="transp-container">

        <div className="banner-transp">
          <div>
            <h1><i className="las la-ambulance"></i> Transporte de Pacientes</h1>
            <p>Controle de remoções internas e externas</p>
          </div>
          <button className="btn btn-success" onClick={() => setActiveTab('solicitar')}>
            <i className="las la-plus-circle"></i> Nova Solicitação
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-numero">{statTotal}</div>
            <div className="stat-label">Solicitações Hoje</div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#d97706'}}>
            <div className="stat-numero" style={{color: '#d97706'}}>{statPendentes}</div>
            <div className="stat-label">Pendentes</div>
          </div>
        </div>

        <div className="tabs-transp">
          <button className={`tab-btn ${activeTab === 'solicitar' ? 'ativo' : ''}`} onClick={() => setActiveTab('solicitar')}>
            <i className="las la-plus-circle"></i> Solicitar
          </button>
          <button className={`tab-btn ${activeTab === 'lista' ? 'ativo' : ''}`} onClick={() => setActiveTab('lista')}>
            <i className="las la-list"></i> Lista
          </button>
        </div>

        {activeTab === 'solicitar' && (
          <div className="form-panel">
            <h3><i className="las la-ambulance"></i> Solicitar Transporte</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Paciente *</label>
                <select value={transpPaciente} onChange={e => setTranspPaciente(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Origem *</label>
                <select value={transpOrigem} onChange={e => setTranspOrigem(e.target.value)}>
                  <option>Enfermaria</option>
                  <option>UTI</option>
                  <option>Emergência</option>
                  <option>Centro Cirúrgico</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Destino *</label>
                <select value={transpDestino} onChange={e => setTranspDestino(e.target.value)}>
                  <option>Centro de Imagem</option>
                  <option>Laboratório</option>
                  <option>UTI</option>
                  <option>Enfermaria</option>
                  <option>Alta/Hospitalar</option>
                  <option>Transferência Externa</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Tipo *</label>
                <select value={transpTipo} onChange={e => setTranspTipo(e.target.value)}>
                  <option>Interno (Cadeira de Rodas)</option>
                  <option>Interno (Maca)</option>
                  <option>Externo (Ambulância)</option>
                  <option>UTI Móvel</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Solicitante</label>
                <input type="text" value={transpSolicitante} onChange={e => setTranspSolicitante(e.target.value)} />
              </div>
              <div className="form-grupo">
                <label>Data/Hora</label>
                <input type="datetime-local" value={transpData} onChange={e => setTranspData(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-success" onClick={solicitarTransporte} style={{width:'100%', marginTop:'15px', padding:'14px', justifyContent:'center'}}>
              <i className="las la-save"></i> Solicitar Transporte
            </button>
          </div>
        )}

        {activeTab === 'lista' && (
          <div style={{background:'white', borderRadius:'20px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', overflowX:'auto'}}>
            <table className="tabela-transp">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Paciente</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transportes.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhuma solicitação</td></tr>
                ) : (
                  transportes.slice().reverse().map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.data).toLocaleString('pt-BR')}</td>
                      <td><strong>{t.paciente}</strong></td>
                      <td>{t.origem}</td>
                      <td>{t.destino}</td>
                      <td>{t.tipo}</td>
                      <td>
                        <span className={`badge ${t.status === 'Concluído' ? 'badge-success' : 'badge-warning'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        {t.status === 'Pendente' && (
                          <button className="btn btn-xs btn-success" onClick={() => concluirTransporte(t.id)}>
                            <i className="las la-check"></i> Concluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
