'use client';

import { useState, useEffect } from 'react';

interface PacienteData {
  nome: string;
  cpf: string | null;
  telefone: string | null;
}

interface Agendamento {
  id: string;
  dataHora: string;
  tipo: string;
  especialidade: string;
  profissional: string | null;
  sala: string | null;
  status: string;
  paciente: PacienteData;
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agendamentos')
      .then(res => res.json())
      .then(data => {
        setAgendamentos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMADO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-calendar"></i> Agenda Central</h2>
          <p>Controle de agendamentos e retornos</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => alert('Modal de Novo Agendamento será aberto aqui')}>
            <i className="las la-plus"></i> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Consultas de Hoje</h3>
          
          {loading ? (
            <p>Carregando agendamentos...</p>
          ) : agendamentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="las la-inbox" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
              <p>Nenhum agendamento encontrado para o hospital.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Paciente</th>
                    <th>Especialidade</th>
                    <th>Profissional</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentos.map(agenda => (
                    <tr key={agenda.id}>
                      <td style={{ fontWeight: 600 }}>{new Date(agenda.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{agenda.paciente.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{agenda.paciente.telefone || 'Sem telefone'}</div>
                      </td>
                      <td>{agenda.especialidade}</td>
                      <td>{agenda.profissional || 'Não definido'}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(agenda.status).split(' ')[0]}`} style={{ color: 'inherit' }}>
                           {agenda.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" title="Editar"><i className="las la-edit"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Filtros</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Data</label>
              <input type="date" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Especialidade</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option>Todas</option>
                <option>Cardiologia</option>
                <option>Clínico Geral</option>
                <option>Ortopedia</option>
              </select>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
               Filtrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
