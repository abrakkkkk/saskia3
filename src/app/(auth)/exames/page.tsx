'use client';

import { useState, useEffect } from 'react';

interface Paciente {
  id: string;
  nome: string;
}

interface Exame {
  id: string;
  paciente: Paciente;
  tipo: string;
  nome: string;
  resultado: string | null;
  status: string;
  createdAt: string;
}

export default function ExamesPage() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Novo Exame States
  const [pacienteSelecionado, setPacienteSelecionado] = useState('');
  const [tipo, setTipo] = useState('Sangue');
  const [nomeExame, setNomeExame] = useState('');

  const carregarDados = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/pacientes').then(res => res.json()),
      fetch('/api/exames').then(res => res.json())
    ]).then(([pacs, exs]) => {
      setPacientes(pacs);
      setExames(exs);
      setLoading(false);
    });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const solicitarExame = async () => {
    if (!pacienteSelecionado || !nomeExame) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/exames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          tipo,
          nome: nomeExame
        })
      });

      if (res.ok) {
        setPacienteSelecionado('');
        setNomeExame('');
        carregarDados();
      } else {
        alert('Erro ao solicitar exame.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SOLICITADO': return 'bg-yellow-100 text-yellow-800';
      case 'COLETADO': return 'bg-blue-100 text-blue-800';
      case 'EM_ANALISE': return 'bg-purple-100 text-purple-800';
      case 'CONCLUIDO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const atualizarStatusFake = (id: string, currentStatus: string) => {
    // Apenas para simular a esteira no Frontend. O certo seria ter a rota PATCH.
    const steps = ['SOLICITADO', 'COLETADO', 'EM_ANALISE', 'CONCLUIDO'];
    const nextIdx = steps.indexOf(currentStatus) + 1;
    if (nextIdx >= steps.length) {
       alert('Exame já concluído!');
       return;
    }
    const newStatus = steps[nextIdx];
    
    // Atualiza localmente
    setExames(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-flask"></i> Laboratório e Exames</h2>
          <p>Gestão de solicitações, coletas e resultados</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Solicitar Exame</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Paciente</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Tipo de Exame</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="Sangue">Exame de Sangue</option>
                <option value="Imagem">Exame de Imagem (Raio-X, Tomo)</option>
                <option value="Urina">Exame de Urina</option>
                <option value="Biopsia">Biópsia</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Nome / Especificação</label>
              <input type="text" className="input-field" placeholder="Ex: Hemograma Completo" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={nomeExame} onChange={(e) => setNomeExame(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }} onClick={solicitarExame}>
              <i className="las la-plus"></i> Criar Solicitação
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Painel de Exames (Esteira)</h3>
          
          {loading ? (
            <p>Carregando exames...</p>
          ) : exames.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="las la-vial" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
              <p>Nenhum exame solicitado no momento.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Exame</th>
                    <th>Data Solicitação</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {exames.map(exame => (
                    <tr key={exame.id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{exame.paciente.nome}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{exame.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{exame.tipo}</div>
                      </td>
                      <td>{new Date(exame.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(exame.status).split(' ')[0]}`} style={{ color: 'inherit' }}>
                           {exame.status}
                        </span>
                      </td>
                      <td>
                        {exame.status !== 'CONCLUIDO' ? (
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => atualizarStatusFake(exame.id, exame.status)}
                          >
                            <i className="las la-step-forward"></i> Avançar Status
                          </button>
                        ) : (
                          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#3b82f6' }}>
                            <i className="las la-file-pdf"></i> Resultado
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
