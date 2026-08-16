'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'EM ATENDIMENTO' | 'FINALIZADO';
  paciente: PacienteData;
  observacoes?: string;
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('Todas');
  const [termoBusca, setTermoBusca] = useState('');
  
  // Modal de Ações
  const [agendaSelecionada, setAgendaSelecionada] = useState<Agendamento | null>(null);

  const carregarAgendamentos = async () => {
    try {
      const res = await fetch('/api/agendamentos');
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId) {
      carregarAgendamentos();
    }
  }, [hospitalId]);

  const alterarStatus = async (id: string, novoStatus: Agendamento['status']) => {
    if (novoStatus === 'CANCELADO') {
      const senha = prompt("Ação Restrita: Digite sua senha para cancelar este agendamento:");
      if (senha !== usuario?.senha) {
        alert("Senha incorreta!");
        return;
      }
    }
    
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      
      if (res.ok) {
        carregarAgendamentos();
        setAgendaSelecionada(null);
      } else {
        alert("Erro ao alterar o status do agendamento");
      }
    } catch (error) {
      alert("Erro de conexão");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO': return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
      case 'CONFIRMADO': return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' };
      case 'CANCELADO': return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
      case 'EM ATENDIMENTO': return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
      case 'FINALIZADO': return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
      default: return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
    }
  };

  const agendamentosFiltrados = agendamentos.filter(a => {
    const dataMatch = a.dataHora.startsWith(filtroData);
    const espMatch = filtroEspecialidade === 'Todas' || a.especialidade === filtroEspecialidade;
    const buscaMatch = termoBusca === '' || 
      a.paciente.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      (a.paciente.cpf && a.paciente.cpf.includes(termoBusca));
      
    return dataMatch && espMatch && buscaMatch;
  }).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  // Estatísticas do dia
  const stats = {
    agendados: agendamentosFiltrados.filter(a => a.status === 'AGENDADO').length,
    confirmados: agendamentosFiltrados.filter(a => a.status === 'CONFIRMADO').length,
    atendidos: agendamentosFiltrados.filter(a => a.status === 'FINALIZADO').length,
    cancelados: agendamentosFiltrados.filter(a => a.status === 'CANCELADO').length,
  };

  const especialidades = ['Todas', ...Array.from(new Set(agendamentos.map(a => a.especialidade).filter(Boolean)))];

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <h2><i className="las la-calendar"></i> Agenda Central</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => alert('Novo agendamento em desenvolvimento')}>
            <i className="las la-plus-circle"></i> Novo Agendamento
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><i className="las la-calendar-day"></i></div>
          <div><div className="stat-numero" style={{ color: '#3b82f6' }}>{stats.agendados}</div><div className="stat-label">Agendados</div></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon verde"><i className="las la-check-circle"></i></div>
          <div><div className="stat-numero" style={{ color: '#10b981' }}>{stats.confirmados}</div><div className="stat-label">Confirmados</div></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #64748b' }}>
          <div className="stat-icon" style={{ background: '#f1f5f9', color: '#64748b' }}><i className="las la-stethoscope"></i></div>
          <div><div className="stat-numero">{stats.atendidos}</div><div className="stat-label">Atendidos</div></div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-icon vermelho"><i className="las la-times-circle"></i></div>
          <div><div className="stat-numero" style={{ color: '#ef4444' }}>{stats.cancelados}</div><div className="stat-label">Cancelados</div></div>
        </div>
      </div>

      {/* FILTROS NO TOPO (EM LINHA) */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Data da Agenda</label>
          <input 
            type="date" 
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#0f172a' }}
          />
        </div>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Especialidade</label>
          <select 
            value={filtroEspecialidade}
            onChange={(e) => setFiltroEspecialidade(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#0f172a' }}
          >
            {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Buscar Paciente</label>
          <div className="busca-wrapper" style={{ margin: 0, width: '100%' }}>
            <i className="las la-search" style={{ color: '#64748b' }}></i>
            <input 
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Nome ou CPF..."
              style={{ width: '100%', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', paddingLeft: '40px' }}
            />
          </div>
        </div>
      </div>

      {/* TABELA DE AGENDAMENTOS */}
      <div className="tabela-wrapper">
        <table className="tabela">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Horário</th>
              <th>Paciente</th>
              <th>Detalhes</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: '100px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}><i className="las la-spinner la-spin" style={{ fontSize: '24px' }}></i><br/>Carregando...</td></tr>
            ) : agendamentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <i className="las la-calendar-times" style={{ fontSize: '48px', opacity: 0.3, marginBottom: '10px', display: 'block' }}></i>
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>Nenhum agendamento encontrado para esta data.</span>
                </td>
              </tr>
            ) : (
              agendamentosFiltrados.map((agenda) => {
                const isPast = new Date(agenda.dataHora) < new Date();
                const cor = getStatusColor(agenda.status);
                return (
                  <tr key={agenda.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: isPast && agenda.status === 'AGENDADO' ? '#ef4444' : '#0a1f44', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="las la-clock" style={{ opacity: 0.5 }}></i>
                        {new Date(agenda.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0a1f44' }}>{agenda.paciente.nome}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {agenda.paciente.cpf && <span style={{ marginRight: '10px' }}><i className="las la-id-card"></i> {agenda.paciente.cpf}</span>}
                        {agenda.paciente.telefone && <span><i className="las la-phone"></i> {agenda.paciente.telefone}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontWeight: 600, color: '#1e3a8a' }}><i className="las la-stethoscope"></i> {agenda.especialidade}</span>
                        {agenda.profissional && <span style={{ color: '#475569' }}><i className="las la-user-md"></i> {agenda.profissional}</span>}
                        {agenda.sala && <span style={{ color: '#64748b' }}><i className="las la-map-marker"></i> {agenda.sala}</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        background: cor.bg, color: cor.text, border: `1px solid ${cor.border}`,
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px'
                      }}>
                        {agenda.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-xs" 
                        style={{ background: '#f1f5f9', color: '#475569' }}
                        onClick={() => setAgendaSelecionada(agenda)}
                        title="Opções"
                      >
                        <i className="las la-ellipsis-v"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Ações Rápida */}
      {agendaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '350px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0a1f44', fontSize: '16px', fontWeight: 700 }}>{agendaSelecionada.paciente.nome}</h3>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '12px' }}>Atualizar Status</p>
              </div>
              <button onClick={() => setAgendaSelecionada(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>
            
            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CONFIRMADO')}
                style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#166534', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <i className="las la-check-circle" style={{ fontSize: '18px' }}></i> Confirmar Presença
              </button>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'EM ATENDIMENTO')}
                style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#1e40af', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <i className="las la-stethoscope" style={{ fontSize: '18px' }}></i> Iniciar Atendimento
              </button>

              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'FINALIZADO')}
                style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', border: 'none', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <i className="las la-flag-checkered" style={{ fontSize: '18px' }}></i> Finalizar Consulta
              </button>

              <div style={{ height: '1px', background: '#f1f5f9', margin: '5px 0' }}></div>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CANCELADO')}
                style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#b91c1c', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <i className="las la-times-circle" style={{ fontSize: '18px' }}></i> Cancelar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

