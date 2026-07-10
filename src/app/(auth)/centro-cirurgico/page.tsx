'use client';

import { useState, useEffect } from 'react';

interface Paciente {
  id: string;
  nome: string;
}

interface Cirurgia {
  id: string;
  paciente: Paciente;
  procedimento: string;
  sala: string;
  dataHora: string;
  equipe: string;
  anestesia: string;
  status: string;
}

export default function CentroCirurgicoPage() {
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [pacienteSelecionado, setPacienteSelecionado] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [sala, setSala] = useState('Sala 01');
  const [dataHora, setDataHora] = useState('');
  const [equipe, setEquipe] = useState('');

  const carregarDados = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/pacientes').then(res => res.json()),
      fetch('/api/cirurgias').then(res => res.json())
    ]).then(([pacs, cirs]) => {
      setPacientes(pacs);
      setCirurgias(cirs);
      setLoading(false);
    });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const agendarCirurgia = async () => {
    if (!pacienteSelecionado || !procedimento || !dataHora) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/cirurgias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          procedimento,
          sala,
          dataHora,
          equipe
        })
      });

      if (res.ok) {
        setPacienteSelecionado('');
        setProcedimento('');
        setDataHora('');
        setEquipe('');
        carregarDados();
      } else {
        alert('Erro ao agendar.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGENDADA': return 'bg-gray-100 text-gray-800';
      case 'EM_PREPARO': return 'bg-yellow-100 text-yellow-800';
      case 'EM_ANDAMENTO': return 'bg-red-100 text-red-800 font-bold animate-pulse';
      case 'CONCLUIDA': return 'bg-green-100 text-green-800';
      case 'CANCELADA': return 'bg-gray-800 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const atualizarStatusFake = (id: string, currentStatus: string) => {
    const steps = ['AGENDADA', 'EM_PREPARO', 'EM_ANDAMENTO', 'CONCLUIDA'];
    const nextIdx = steps.indexOf(currentStatus) + 1;
    if (nextIdx >= steps.length) return;
    const newStatus = steps[nextIdx];
    
    setCirurgias(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const metricas = {
    agendadas: cirurgias.filter(c => c.status === 'AGENDADA' || c.status === 'EM_PREPARO').length,
    emAndamento: cirurgias.filter(c => c.status === 'EM_ANDAMENTO').length,
    concluidas: cirurgias.filter(c => c.status === 'CONCLUIDA').length
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-cut"></i> Bloco Cirúrgico</h2>
          <p>Painel de agendamento e controle aéreo de cirurgias</p>
        </div>
      </div>

      {/* Contadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card-contador">
          <div className="contador-info">
            <span className="titulo">AGENDADAS</span>
            <div className="valor">{metricas.agendadas}</div>
          </div>
          <div className="contador-icone" style={{ background: '#fef3c7', color: '#d97706' }}>
            <i className="las la-calendar"></i>
          </div>
        </div>
        <div className="card-contador">
          <div className="contador-info">
            <span className="titulo">EM ANDAMENTO</span>
            <div className="valor" style={{ color: '#dc2626' }}>{metricas.emAndamento}</div>
          </div>
          <div className="contador-icone" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <i className="las la-heartbeat"></i>
          </div>
        </div>
        <div className="card-contador">
          <div className="contador-info">
            <span className="titulo">CONCLUÍDAS</span>
            <div className="valor">{metricas.concluidas}</div>
          </div>
          <div className="contador-icone" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <i className="las la-check-circle"></i>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Novo Agendamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Paciente</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Procedimento</label>
              <input type="text" className="input-field" placeholder="Ex: Apendicectomia" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={procedimento} onChange={(e) => setProcedimento(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Sala Cirúrgica</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={sala} onChange={(e) => setSala(e.target.value)}>
                <option value="Sala 01 - Geral">Sala 01 - Geral</option>
                <option value="Sala 02 - Ortopedia">Sala 02 - Ortopedia</option>
                <option value="Sala 03 - Neuro">Sala 03 - Neuro</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Data e Hora</label>
              <input type="datetime-local" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ justifyContent: 'center', padding: '12px', marginTop: '10px' }} onClick={agendarCirurgia}>
              Agendar Procedimento
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Painel de Cirurgias</h3>
          {loading ? (
            <p>Carregando painel...</p>
          ) : cirurgias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="las la-bed" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
              <p>Nenhuma cirurgia agendada.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Sala</th>
                    <th>Paciente / Procedimento</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cirurgias.map(cir => (
                    <tr key={cir.id}>
                      <td style={{ fontWeight: 600 }}>{new Date(cir.dataHora).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{cir.sala}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{cir.paciente.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{cir.procedimento}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(cir.status).split(' ')[0]}`} style={{ color: 'inherit' }}>
                           {cir.status}
                        </span>
                      </td>
                      <td>
                        {cir.status !== 'CONCLUIDA' && cir.status !== 'CANCELADA' && (
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => atualizarStatusFake(cir.id, cir.status)}
                          >
                            <i className="las la-angle-double-right"></i> Avançar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
