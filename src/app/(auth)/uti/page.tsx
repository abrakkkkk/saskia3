'use client';

import { useState, useEffect } from 'react';
import './uti.css';
import { getIniciais } from '@/lib/utils';

interface LeitoUTI {
  id: number;
  numero: number;
  status: 'disponivel' | 'ocupado' | 'reservado' | 'bloqueado';
  paciente: string | null;
  dataAdmissao: string | null;
  diagnostico: string | null;
}

interface EvolucaoUTI {
  data: string;
  glasgow: string;
  ramsay: string;
  pa: string;
  fc: string;
  fr: string;
  satO2: string;
  temp: string;
  bh: string;
  texto: string;
  profissional: string;
}

interface PacienteUTI {
  id: number;
  nome: string;
  leito: number;
  dataAdmissao: string;
  diagnostico: string;
  procedencia: string;
  vm: boolean;
  avc: boolean;
  sv: boolean;
  dva: boolean;
  nutricao: string;
  obs: string;
  status: string;
  diasUTI?: number;
  evolucoes: EvolucaoUTI[];
  dataAlta?: string;
  dataObito?: string;
}

export default function UtiPage() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'admissao' | 'pacientes' | 'evolucao'>('mapa');
  const [leitosUTI, setLeitosUTI] = useState<LeitoUTI[]>([]);
  const [pacientesUTI, setPacientesUTI] = useState<PacienteUTI[]>([]);
  const [hospitalId, setHospitalId] = useState<string>('hospital_001');
  const [loading, setLoading] = useState(true);
  const [pacientesGerais, setPacientesGerais] = useState<any[]>([]);

  // Admission form state
  const [formAdmissao, setFormAdmissao] = useState({
    nome: '', leito: '', dataAdmissao: '', diagnostico: '',
    procedencia: 'Emergência', vm: 'Não', avc: 'Não', sv: 'Não', dva: 'Não',
    nutricao: 'Via Oral', obs: ''
  });

  // Evolution form state
  const [formEvolucao, setFormEvolucao] = useState({
    pacienteId: '', data: '', glasgow: '', ramsay: '', pa: '', fc: '', fr: '',
    satO2: '', temp: '', bh: '', texto: ''
  });

  const [buscaPaciente, setBuscaPaciente] = useState('');

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      let leitos = JSON.parse(localStorage.getItem(`${hid}_utiLeitos`) || '[]');
      if (leitos.length === 0) {
        leitos = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1, numero: i + 1, status: 'disponivel', paciente: null, dataAdmissao: null, diagnostico: null
        }));
        localStorage.setItem(`${hid}_utiLeitos`, JSON.stringify(leitos));
      }
      setLeitosUTI(leitos);

      const pacs = JSON.parse(localStorage.getItem(`${hid}_utiPacientes`) || '[]');
      pacs.forEach((p: PacienteUTI) => {
        if (p.status === 'Internado' && p.dataAdmissao) {
          p.diasUTI = Math.floor((new Date().getTime() - new Date(p.dataAdmissao).getTime()) / (1000 * 60 * 60 * 24));
        }
      });
      localStorage.setItem(`${hid}_utiPacientes`, JSON.stringify(pacs));
      setPacientesUTI(pacs);

      fetch('/api/pacientes').then(res => res.json()).then(data => setPacientesGerais(data));

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const saveLeitos = (leitos: LeitoUTI[]) => {
    setLeitosUTI(leitos);
    localStorage.setItem(`${hospitalId}_utiLeitos`, JSON.stringify(leitos));
  };

  const savePacientes = (pacs: PacienteUTI[]) => {
    setPacientesUTI(pacs);
    localStorage.setItem(`${hospitalId}_utiPacientes`, JSON.stringify(pacs));
  };

  const admitirPaciente = () => {
    const { nome, leito, dataAdmissao, diagnostico, procedencia, vm, avc, sv, dva, nutricao, obs } = formAdmissao;
    const leitoNum = parseInt(leito);

    if (!nome || !leito || !dataAdmissao || !diagnostico) {
      alert("⚠️ Preencha todos os campos obrigatórios (*)");
      return;
    }

    const novosLeitos = [...leitosUTI];
    const leitoObj = novosLeitos.find(l => l.numero === leitoNum);
    if (leitoObj) {
      leitoObj.status = 'ocupado';
      leitoObj.paciente = nome;
      leitoObj.dataAdmissao = dataAdmissao;
      leitoObj.diagnostico = diagnostico;
    }
    saveLeitos(novosLeitos);

    const novoPaciente: PacienteUTI = {
      id: Date.now(), nome, leito: leitoNum, dataAdmissao, diagnostico, procedencia,
      vm: vm !== 'Não', avc: avc === 'Sim', sv: sv === 'Sim', dva: dva === 'Sim', nutricao, obs,
      status: 'Internado', diasUTI: 0, evolucoes: []
    };

    savePacientes([...pacientesUTI, novoPaciente]);
    
    setFormAdmissao({
      nome: '', leito: '', dataAdmissao: '', diagnostico: '',
      procedencia: 'Emergência', vm: 'Não', avc: 'Não', sv: 'Não', dva: 'Não',
      nutricao: 'Via Oral', obs: ''
    });

    setActiveTab('mapa');
    alert("✅ Paciente admitido na UTI com sucesso!");
  };

  const altaPaciente = (leitoNum: number) => {
    const p = pacientesUTI.find(pu => pu.leito === leitoNum && pu.status === 'Internado');
    if (!p) return;
    if (confirm(`Dar alta da UTI para ${p.nome}?`)) {
      const novosLeitos = [...leitosUTI];
      const leitoObj = novosLeitos.find(l => l.numero === leitoNum);
      if (leitoObj) {
        leitoObj.status = 'disponivel';
        leitoObj.paciente = null;
        leitoObj.dataAdmissao = null;
        leitoObj.diagnostico = null;
      }
      saveLeitos(novosLeitos);

      const novosPacientes = pacientesUTI.map(pu => 
        (pu.leito === leitoNum && pu.status === 'Internado') ? { ...pu, status: 'Alta UTI', dataAlta: new Date().toISOString() } : pu
      );
      savePacientes(novosPacientes);
      alert("✅ Paciente recebeu alta da UTI!");
    }
  };

  const registrarEvolucao = () => {
    const { pacienteId, data, glasgow, ramsay, pa, fc, fr, satO2, temp, bh, texto } = formEvolucao;
    const pId = parseInt(pacienteId);
    
    if (!pId) { alert("Selecione o paciente!"); return; }

    const evolucao: EvolucaoUTI = {
      data: data || new Date().toISOString(),
      glasgow, ramsay, pa, fc, fr, satO2, temp, bh, texto,
      profissional: 'Sistema' // TODO get from logged user
    };

    const novosPacientes = pacientesUTI.map(p => {
      if (p.id === pId) {
        return { ...p, evolucoes: [evolucao, ...(p.evolucoes || [])] };
      }
      return p;
    });

    savePacientes(novosPacientes);
    
    setFormEvolucao({
      ...formEvolucao,
      glasgow: '', pa: '', fc: '', fr: '', satO2: '', temp: '', bh: '', texto: ''
    });
    alert("✅ Evolução registrada!");
  };

  // Indicators
  const ocupados = leitosUTI.filter(l => l.status === 'ocupado').length;
  const disponiveis = leitosUTI.filter(l => l.status === 'disponivel').length;
  const totalLeitos = leitosUTI.length;
  const taxaOcupacao = totalLeitos > 0 ? Math.round((ocupados / totalLeitos) * 100) : 0;
  
  const pacientesInternados = pacientesUTI.filter(p => p.status === 'Internado');
  const vmCount = pacientesInternados.filter(p => p.vm).length;
  const totalDias = pacientesInternados.reduce((acc, p) => acc + (p.diasUTI || 0), 0);
  const tmp = pacientesInternados.length > 0 ? Math.round(totalDias / pacientesInternados.length) : 0;

  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const altas = pacientesUTI.filter(p => p.status === 'Alta UTI' && p.dataAlta && new Date(p.dataAlta).getMonth() + 1 === mesAtual && new Date(p.dataAlta).getFullYear() === anoAtual).length;
  const obitos = pacientesUTI.filter(p => p.status === 'Óbito' && p.dataObito && new Date(p.dataObito).getMonth() + 1 === mesAtual && new Date(p.dataObito).getFullYear() === anoAtual).length;

  const pacientesFiltrados = pacientesUTI.filter(p => 
    p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) || 
    (p.diagnostico || '').toLowerCase().includes(buscaPaciente.toLowerCase()) || 
    String(p.leito).includes(buscaPaciente)
  );

  const statusLabel: Record<string, string> = { disponivel: "✅ Disponível", ocupado: "🔴 Ocupado", reservado: "🟡 Reservado", bloqueado: "⚫ Bloqueado" };

  if (loading) return <div>Carregando UTI...</div>;

  return (
    <div className="conteudo">
      <div className="uti-container">

        <div className="banner-uti">
          <div>
            <h1><i className="las la-procedures"></i> UTI - Gestão de Leitos</h1>
            <p>Monitoramento, indicadores e controle de ocupação da Unidade de Terapia Intensiva</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={() => { setActiveTab('admissao'); setFormAdmissao({...formAdmissao, dataAdmissao: new Date().toISOString().slice(0, 16)}) }}><i className="las la-plus-circle"></i> Admitir Paciente</button>
          </div>
        </div>

        <div className="indicadores-grid">
          <div className="indicador-card bom"><div className="ind-icon"><i className="las la-bed"></i></div><div className="ind-valor">{totalLeitos}</div><div className="ind-label">Total de Leitos</div></div>
          <div className="indicador-card critico"><div className="ind-icon"><i className="las la-door-closed"></i></div><div className="ind-valor">{ocupados}</div><div className="ind-label">Leitos Ocupados</div></div>
          <div className="indicador-card bom"><div className="ind-icon"><i className="las la-door-open"></i></div><div className="ind-valor">{disponiveis}</div><div className="ind-label">Leitos Disponíveis</div></div>
          <div className="indicador-card alerta"><div className="ind-icon"><i className="las la-chart-line"></i></div><div className="ind-valor">{taxaOcupacao}%</div><div className="ind-label">Taxa de Ocupação</div></div>
          <div className="indicador-card"><div className="ind-icon"><i className="las la-clock"></i></div><div className="ind-valor">{tmp}</div><div className="ind-label">TMP (dias)</div></div>
          <div className="indicador-card alerta"><div className="ind-icon"><i className="las la-exclamation-triangle"></i></div><div className="ind-valor">{vmCount}</div><div className="ind-label">Pacientes em VM</div></div>
          <div className="indicador-card"><div className="ind-icon"><i className="las la-calendar-check"></i></div><div className="ind-valor">{altas}</div><div className="ind-label">Altas (Mês)</div></div>
          <div className="indicador-card critico"><div className="ind-icon"><i className="las la-cross"></i></div><div className="ind-valor">{obitos}</div><div className="ind-label">Óbitos (Mês)</div></div>
        </div>

        <div className="tabs-uti">
          <button className={`tab-btn ${activeTab === 'mapa' ? 'ativo' : ''}`} onClick={() => setActiveTab('mapa')}><i className="las la-th-large"></i> Mapa de Leitos</button>
          <button className={`tab-btn ${activeTab === 'admissao' ? 'ativo' : ''}`} onClick={() => { setActiveTab('admissao'); setFormAdmissao({...formAdmissao, dataAdmissao: new Date().toISOString().slice(0, 16)}) }}><i className="las la-user-plus"></i> Admissão</button>
          <button className={`tab-btn ${activeTab === 'pacientes' ? 'ativo' : ''}`} onClick={() => setActiveTab('pacientes')}><i className="las la-users"></i> Pacientes UTI</button>
          <button className={`tab-btn ${activeTab === 'evolucao' ? 'ativo' : ''}`} onClick={() => { setActiveTab('evolucao'); setFormEvolucao({...formEvolucao, data: new Date().toISOString().slice(0, 16)}) }}><i className="las la-notes-medical"></i> Evolução</button>
        </div>

        {activeTab === 'mapa' && (
          <div className="mapa-leitos">
            {leitosUTI.map(l => {
              const paciente = pacientesInternados.find(p => p.leito === l.numero);
              return (
                <div key={l.id} className={`leito-card ${l.status}`}>
                  <div className="leito-numero">
                    <span>UTI {l.numero}</span>
                    <span className="leito-status">{statusLabel[l.status]}</span>
                  </div>
                  {paciente ? (
                    <>
                      <div className="leito-info">
                        <p><i className="las la-user"></i> <strong>{paciente.nome}</strong></p>
                        <p><i className="las la-calendar"></i> Admissão: {new Date(paciente.dataAdmissao).toLocaleDateString('pt-BR')}</p>
                        <p><i className="las la-notes-medical"></i> {paciente.diagnostico || '-'}</p>
                        <p><i className="las la-clock"></i> {paciente.diasUTI || 0} dias na UTI</p>
                      </div>
                      <div className="leito-acoes">
                        <button className="btn btn-sm btn-warning" onClick={() => altaPaciente(l.numero)}><i className="las la-check-circle"></i> Alta</button>
                      </div>
                    </>
                  ) : (
                    <div className="leito-info" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      <i className="las la-bed" style={{ fontSize: '36px' }}></i>
                      <p>Leito disponível</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'admissao' && (
          <div className="form-panel">
            <h3><i className="las la-user-plus"></i> Admitir Paciente na UTI</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Paciente *</label>
                <select value={formAdmissao.nome} onChange={e => setFormAdmissao({...formAdmissao, nome: e.target.value})}>
                  <option value="">Selecione...</option>
                  {pacientesGerais.map((p, i) => <option key={i} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Leito *</label>
                <select value={formAdmissao.leito} onChange={e => setFormAdmissao({...formAdmissao, leito: e.target.value})}>
                  <option value="">Selecione o leito...</option>
                  {leitosUTI.filter(l => l.status === 'disponivel').map(l => <option key={l.id} value={l.numero}>Leito UTI {l.numero}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Data/Hora Admissão *</label>
                <input type="datetime-local" value={formAdmissao.dataAdmissao} onChange={e => setFormAdmissao({...formAdmissao, dataAdmissao: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label>Diagnóstico Admissão *</label>
                <input type="text" placeholder="Diagnóstico principal" value={formAdmissao.diagnostico} onChange={e => setFormAdmissao({...formAdmissao, diagnostico: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label>Procedência</label>
                <select value={formAdmissao.procedencia} onChange={e => setFormAdmissao({...formAdmissao, procedencia: e.target.value})}>
                  <option>Emergência</option><option>Centro Cirúrgico</option><option>Enfermaria</option><option>Transferência Externa</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Ventilação Mecânica</label>
                <select value={formAdmissao.vm} onChange={e => setFormAdmissao({...formAdmissao, vm: e.target.value})}>
                  <option>Não</option><option>Sim - TOT</option><option>Sim - TQT</option><option>VNI</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Acesso Venoso Central</label>
                <select value={formAdmissao.avc} onChange={e => setFormAdmissao({...formAdmissao, avc: e.target.value})}><option>Não</option><option>Sim</option></select>
              </div>
              <div className="form-grupo">
                <label>Sonda Vesical</label>
                <select value={formAdmissao.sv} onChange={e => setFormAdmissao({...formAdmissao, sv: e.target.value})}><option>Não</option><option>Sim</option></select>
              </div>
              <div className="form-grupo">
                <label>Drogas Vasoativas</label>
                <select value={formAdmissao.dva} onChange={e => setFormAdmissao({...formAdmissao, dva: e.target.value})}><option>Não</option><option>Sim</option></select>
              </div>
              <div className="form-grupo">
                <label>Nutrição</label>
                <select value={formAdmissao.nutricao} onChange={e => setFormAdmissao({...formAdmissao, nutricao: e.target.value})}>
                  <option>Via Oral</option><option>Enteral (SNE/SNG)</option><option>Parenteral (NPT)</option><option>Jejum</option>
                </select>
              </div>
              <div className="form-grupo full">
                <label>Observações</label>
                <textarea rows={2} value={formAdmissao.obs} onChange={e => setFormAdmissao({...formAdmissao, obs: e.target.value})}></textarea>
              </div>
            </div>
            <button className="btn btn-success" onClick={admitirPaciente} style={{ width: '100%', marginTop: '15px', justifyContent: 'center', padding: '14px' }}>
              <i className="las la-save"></i> Admitir na UTI
            </button>
          </div>
        )}

        {activeTab === 'pacientes' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por nome, leito ou diagnóstico..." value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)} />
            </div>
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table className="tabela-uti">
                <thead>
                  <tr>
                    <th>Leito</th><th>Paciente</th><th>Diagnóstico</th><th>Admissão</th><th>Dias UTI</th><th>VM</th><th>DVA</th><th>Status</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum paciente encontrado</td></tr>
                  ) : (
                    pacientesFiltrados.map(p => (
                      <tr key={p.id}>
                        <td><strong>Leito {p.leito}</strong></td>
                        <td>{p.nome}</td>
                        <td>{p.diagnostico}</td>
                        <td>{new Date(p.dataAdmissao).toLocaleDateString('pt-BR')}</td>
                        <td>{p.diasUTI || 0}</td>
                        <td><span className={`badge ${p.vm ? 'badge-danger' : 'badge-success'}`}>{p.vm ? 'Sim' : 'Não'}</span></td>
                        <td><span className={`badge ${p.dva ? 'badge-danger' : 'badge-success'}`}>{p.dva ? 'Sim' : 'Não'}</span></td>
                        <td><span className="badge badge-info">{p.status}</span></td>
                        <td>
                          {p.status === 'Internado' && (
                            <button className="btn btn-sm btn-warning" onClick={() => altaPaciente(p.leito)}><i className="las la-check-circle"></i></button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'evolucao' && (
          <div>
            <div className="form-panel">
              <h3><i className="las la-notes-medical"></i> Registrar Evolução UTI</h3>
              <div className="form-grid">
                <div className="form-grupo">
                  <label>Paciente UTI *</label>
                  <select value={formEvolucao.pacienteId} onChange={e => setFormEvolucao({...formEvolucao, pacienteId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {pacientesInternados.map(p => <option key={p.id} value={p.id}>Leito {p.leito} - {p.nome}</option>)}
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Data/Hora</label>
                  <input type="datetime-local" value={formEvolucao.data} onChange={e => setFormEvolucao({...formEvolucao, data: e.target.value})} />
                </div>
                <div className="form-grupo">
                  <label>Glasgow</label>
                  <input type="number" min="3" max="15" placeholder="3-15" value={formEvolucao.glasgow} onChange={e => setFormEvolucao({...formEvolucao, glasgow: e.target.value})} />
                </div>
                <div className="form-grupo">
                  <label>Ramsay</label>
                  <select value={formEvolucao.ramsay} onChange={e => setFormEvolucao({...formEvolucao, ramsay: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="1">1 - Ansioso</option>
                    <option value="2">2 - Cooperativo</option>
                    <option value="3">3 - Responde a comandos</option>
                    <option value="4">4 - Dormindo, responde rápido</option>
                    <option value="5">5 - Dormindo, responde lentamente</option>
                    <option value="6">6 - Sem resposta</option>
                  </select>
                </div>
                <div className="form-grupo"><label>PA</label><input type="text" placeholder="120/80" value={formEvolucao.pa} onChange={e => setFormEvolucao({...formEvolucao, pa: e.target.value})} /></div>
                <div className="form-grupo"><label>FC</label><input type="number" placeholder="bpm" value={formEvolucao.fc} onChange={e => setFormEvolucao({...formEvolucao, fc: e.target.value})} /></div>
                <div className="form-grupo"><label>FR</label><input type="number" placeholder="rpm" value={formEvolucao.fr} onChange={e => setFormEvolucao({...formEvolucao, fr: e.target.value})} /></div>
                <div className="form-grupo"><label>SatO₂</label><input type="number" placeholder="%" value={formEvolucao.satO2} onChange={e => setFormEvolucao({...formEvolucao, satO2: e.target.value})} /></div>
                <div className="form-grupo"><label>Temp</label><input type="number" step="0.1" placeholder="°C" value={formEvolucao.temp} onChange={e => setFormEvolucao({...formEvolucao, temp: e.target.value})} /></div>
                <div className="form-grupo"><label>Balanço Hídrico (24h)</label><input type="text" placeholder="Ex: +500ml" value={formEvolucao.bh} onChange={e => setFormEvolucao({...formEvolucao, bh: e.target.value})} /></div>
                <div className="form-grupo full"><label>Evolução</label><textarea rows={3} placeholder="Descreva a evolução clínica..." value={formEvolucao.texto} onChange={e => setFormEvolucao({...formEvolucao, texto: e.target.value})}></textarea></div>
              </div>
              <button className="btn btn-primary" onClick={registrarEvolucao} style={{ width: '100%', marginTop: '15px', justifyContent: 'center', padding: '14px' }}>
                <i className="las la-save"></i> Registrar Evolução
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              {(() => {
                const p = pacientesUTI.find(pu => pu.id === parseInt(formEvolucao.pacienteId));
                if (!p || !p.evolucoes || p.evolucoes.length === 0) {
                  return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhuma evolução registrada.</p>;
                }
                return p.evolucoes.slice(0, 10).map((e, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '15px', marginBottom: '10px', borderLeft: '4px solid #1e3a8a' }}>
                    <strong>{new Date(e.data).toLocaleString('pt-BR')}</strong> - {e.profissional}<br />
                    <small>Glasgow: {e.glasgow || '-'} | PA: {e.pa || '-'} | FC: {e.fc || '-'} | SatO₂: {e.satO2 || '-'} | BH: {e.bh || '-'}</small>
                    {e.texto && <p style={{ marginTop: '8px' }}>{e.texto}</p>}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
