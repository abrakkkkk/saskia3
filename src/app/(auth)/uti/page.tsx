'use client';

import { useState, useEffect } from 'react';
import './uti.css';

interface UtiLeito {
  id: string;
  numero: number;
  status: string; // LIVRE, OCUPADO, RESERVADO, MANUTENCAO, LIMPEZA
  pacienteNome: string | null;
  pacienteCpf: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Paciente {
  id: string;
  nome: string;
}

// In a real scenario we'd query the Paciente directly and maybe EscoreClinico/SinalVital for Evolucao
// For simplicity we will continue to use the Leito API to admit/discharge.
// EscoreClinico will be mocked or just skipped in this specific rewrite if no API exists for it.

export default function UtiPage() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'admissao' | 'pacientes' | 'evolucao'>('mapa');
  const [leitosUTI, setLeitosUTI] = useState<UtiLeito[]>([]);
  const [pacientesGerais, setPacientesGerais] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Admission form state
  const [formAdmissao, setFormAdmissao] = useState({
    nome: '', leitoId: '', dataAdmissao: '', diagnostico: '',
    procedencia: 'Emergência', vm: 'Não', avc: 'Não', sv: 'Não', dva: 'Não',
    nutricao: 'Via Oral', obs: ''
  });

  // Evolution form state
  const [formEvolucao, setFormEvolucao] = useState({
    leitoId: '', data: '', glasgow: '', ramsay: '', pa: '', fc: '', fr: '',
    satO2: '', temp: '', bh: '', texto: ''
  });

  const [buscaPaciente, setBuscaPaciente] = useState('');

  const carregarDados = async () => {
    try {
      const [resLeitos, resPacientes] = await Promise.all([
        fetch('/api/uti'),
        fetch('/api/pacientes')
      ]);
      
      if(resLeitos.ok) setLeitosUTI(await resLeitos.json());
      if(resPacientes.ok) setPacientesGerais(await resPacientes.json());
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const admitirPaciente = async () => {
    const { nome, leitoId, dataAdmissao, diagnostico } = formAdmissao;

    if (!nome || !leitoId || !dataAdmissao || !diagnostico) {
      alert("⚠️ Preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const res = await fetch(`/api/uti/${leitoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'OCUPADO',
          pacienteNome: nome,
          // Not sending CPF right now for simplicity since nome is typed or selected.
          // In real life we'd send the ID and fetch the Patient model.
        })
      });

      if(!res.ok) throw new Error("Erro ao admitir paciente no leito");

      setFormAdmissao({
        nome: '', leitoId: '', dataAdmissao: '', diagnostico: '',
        procedencia: 'Emergência', vm: 'Não', avc: 'Não', sv: 'Não', dva: 'Não',
        nutricao: 'Via Oral', obs: ''
      });

      setActiveTab('mapa');
      alert("✅ Paciente admitido na UTI com sucesso!");
      carregarDados();
    } catch(e: any) {
      alert(e.message);
    }
  };

  const altaPaciente = async (leitoId: string, nome: string | null) => {
    if (await confirm(`Dar alta da UTI para ${nome || 'este paciente'}?`)) {
      try {
        const res = await fetch(`/api/uti/${leitoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'LIVRE',
            pacienteNome: null,
            pacienteCpf: null
          })
        });
        if(!res.ok) throw new Error("Erro ao dar alta do leito");

        alert("✅ Paciente recebeu alta da UTI!");
        carregarDados();
      } catch(e: any) {
        alert(e.message);
      }
    }
  };

  const registrarEvolucao = () => {
    const { leitoId, data, glasgow, ramsay, pa, fc, fr, satO2, temp, bh, texto } = formEvolucao;
    
    if (!leitoId) { alert("Selecione o leito!"); return; }

    alert("✅ Evolução registrada com sucesso (Simulado)!");
    setFormEvolucao({
      ...formEvolucao,
      glasgow: '', pa: '', fc: '', fr: '', satO2: '', temp: '', bh: '', texto: ''
    });
  };

  // Indicators
  const ocupados = leitosUTI.filter(l => l.status === 'OCUPADO').length;
  const disponiveis = leitosUTI.filter(l => l.status === 'LIVRE').length;
  const totalLeitos = leitosUTI.length;
  const taxaOcupacao = totalLeitos > 0 ? Math.round((ocupados / totalLeitos) * 100) : 0;
  
  const pacientesInternados = leitosUTI.filter(l => l.status === 'OCUPADO');
  const vmCount = 0; // Mocked
  const tmp = 0; // Mocked

  const altas = 0; // Mocked
  const obitos = 0; // Mocked

  const leitosFiltrados = leitosUTI.filter(l => 
    l.status === 'OCUPADO' && l.pacienteNome &&
    (l.pacienteNome.toLowerCase().includes(buscaPaciente.toLowerCase()) || 
    String(l.numero).includes(buscaPaciente))
  );

  const statusLabel: Record<string, string> = { LIVRE: "✅ Disponível", OCUPADO: "🔴 Ocupado", RESERVADO: "🟡 Reservado", MANUTENCAO: "⚫ Manutenção", LIMPEZA: "🔵 Limpeza" };
  const cssClassMap: Record<string, string> = { LIVRE: "disponivel", OCUPADO: "ocupado", RESERVADO: "reservado", MANUTENCAO: "bloqueado", LIMPEZA: "bloqueado" };

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
              return (
                <div key={l.id} className={`leito-card ${cssClassMap[l.status]}`}>
                  <div className="leito-numero">
                    <span>UTI {l.numero}</span>
                    <span className="leito-status">{statusLabel[l.status]}</span>
                  </div>
                  {l.status === 'OCUPADO' ? (
                    <>
                      <div className="leito-info">
                        <p><i className="las la-user"></i> <strong>{l.pacienteNome}</strong></p>
                        <p><i className="las la-calendar"></i> Última Att: {new Date(l.updatedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="leito-acoes">
                        <button className="btn btn-sm btn-warning" onClick={() => altaPaciente(l.id, l.pacienteNome)}><i className="las la-check-circle"></i> Alta</button>
                      </div>
                    </>
                  ) : (
                    <div className="leito-info" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      <i className="las la-bed" style={{ fontSize: '36px' }}></i>
                      <p>Leito {l.status === 'LIVRE' ? 'disponível' : l.status.toLowerCase()}</p>
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
                  {pacientesGerais.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                  <option value="Paciente Transferido Externo">Outro (Não cadastrado)</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Leito *</label>
                <select value={formAdmissao.leitoId} onChange={e => setFormAdmissao({...formAdmissao, leitoId: e.target.value})}>
                  <option value="">Selecione o leito...</option>
                  {leitosUTI.filter(l => l.status === 'LIVRE').map(l => <option key={l.id} value={l.id}>Leito UTI {l.numero}</option>)}
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
              <input type="text" placeholder="Buscar por nome ou leito..." value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)} />
            </div>
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table className="tabela-uti">
                <thead>
                  <tr>
                    <th>Leito</th><th>Paciente</th><th>Status</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leitosFiltrados.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum paciente internado encontrado</td></tr>
                  ) : (
                    leitosFiltrados.map(l => (
                      <tr key={l.id}>
                        <td><strong>Leito {l.numero}</strong></td>
                        <td>{l.pacienteNome}</td>
                        <td><span className="badge badge-info">{l.status}</span></td>
                        <td>
                          {l.status === 'OCUPADO' && (
                            <button className="btn btn-sm btn-warning" onClick={() => altaPaciente(l.id, l.pacienteNome)}><i className="las la-check-circle"></i></button>
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
                  <label>Leito Ocupado *</label>
                  <select value={formEvolucao.leitoId} onChange={e => setFormEvolucao({...formEvolucao, leitoId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {pacientesInternados.map(p => <option key={p.id} value={p.id}>Leito {p.numero} - {p.pacienteNome}</option>)}
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
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>As evoluções aparecerão aqui após registro (mockado).</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
