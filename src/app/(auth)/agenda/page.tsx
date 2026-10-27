'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { inter } from '@/app/fonts'

function dataLocalAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

interface PacienteData {
  id?: string;
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
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'EM_ESPERA' | 'FALTOU';
  paciente: PacienteData;
  observacoes?: string;
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  
  const [filtroData, setFiltroData] = useState(dataLocalAtual);
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('Todas');
  const [termoBusca, setTermoBusca] = useState('');
  
  // Modal de Ações
  const [agendaSelecionada, setAgendaSelecionada] = useState<Agendamento | null>(null);

  const carregarAgendamentos = async () => {
    setErro('');
    try {
      const res = await fetch('/api/agendamentos');
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(Array.isArray(data) ? data : []);
      } else {
        const result = await res.json().catch(() => ({}));
        setAgendamentos([]);
        setErro(result.error || 'Não foi possível carregar os agendamentos.');
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos', error);
      setAgendamentos([]);
      setErro('Falha de conexão ao carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAgendamentos();
    fetch('/api/pacientes').then(async response => {
      if (!response.ok) throw new Error('Não foi possível carregar os pacientes.');
      const data = await response.json();
      setPacientes(Array.isArray(data) ? data.map((item: { id: string; nome: string }) => ({ id: item.id, nome: item.nome })) : []);
    }).catch(error => setErro(error instanceof Error ? error.message : 'Erro ao carregar pacientes.'));
  }, []);

  const criarAgendamento = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSalvando(true);
    setErro('');
    const form = new FormData(formElement);
    const dataHora = new Date(`${form.get('data')}T${form.get('hora')}:00`);
    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteId: form.get('pacienteId'), dataHora: dataHora.toISOString(), tipo: form.get('tipo'), especialidade: form.get('especialidade'), profissional: form.get('profissional') || undefined, sala: form.get('sala') || undefined, observacoes: form.get('observacoes') || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível criar o agendamento.');
      await carregarAgendamentos();
      setCriando(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro de conexão ao criar agendamento.');
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatus = async (id: string, novoStatus: Agendamento['status']) => {
    if (novoStatus === 'CANCELADO') {
      const confirmacao = window.confirm("Deseja realmente cancelar este agendamento?");
      if (!confirmacao) return;
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
        const result = await res.json().catch(() => ({}));
        setErro(result.error || 'Erro ao alterar o status do agendamento.');
        setAgendaSelecionada(null);
      }
    } catch (error) {
      setErro('Falha de conexão ao alterar o status do agendamento.');
      setAgendaSelecionada(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO': return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
      case 'CONFIRMADO': return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' };
      case 'CANCELADO': return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
      case 'EM_ESPERA': return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' };
      case 'FALTOU': return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
      case 'EM_ATENDIMENTO': return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
      case 'CONCLUIDO': return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
      default: return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
    }
  };

  const agendamentosFiltrados = agendamentos.filter(a => {
    const dataMatch = new Date(a.dataHora).toLocaleDateString('sv-SE') === filtroData;
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
    atendidos: agendamentosFiltrados.filter(a => a.status === 'CONCLUIDO').length,
    cancelados: agendamentosFiltrados.filter(a => a.status === 'CANCELADO').length,
  };

  const especialidades = ['Todas', ...Array.from(new Set(agendamentos.map(a => a.especialidade).filter(Boolean)))];

  return (
    <div className={inter.className} style={{ padding: '32px', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <i className="las la-calendar" style={{ color: '#1d4ed8' }}></i> Agenda Central
          </h2>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>Gerencie os atendimentos e consultas do dia</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            style={{ backgroundColor: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid #0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            onClick={() => { setErro(''); setCriando(true); }}
          >
            <i className="las la-plus-circle" style={{ fontSize: '18px', opacity: 0.9 }}></i> Novo Agendamento
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Agendados */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            <i className="las la-calendar-day"></i>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats.agendados}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>Agendados</div>
          </div>
        </div>

        {/* Confirmados */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            <i className="las la-check-circle"></i>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats.confirmados}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>Confirmados</div>
          </div>
        </div>

        {/* Atendidos */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            <i className="las la-stethoscope"></i>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats.atendidos}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>Atendidos</div>
          </div>
        </div>

        {/* Cancelados */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            <i className="las la-times-circle"></i>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats.cancelados}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>Cancelados</div>
          </div>
        </div>

      </div>

      {/* COMMAND BAR / FILTROS */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
        
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginLeft: '4px' }}>Data da Agenda</label>
          <input 
            type="date" 
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #94a3b8', borderRadius: '8px', fontSize: '14px', padding: '10px 16px', color: '#1e293b', fontWeight: 600, outline: 'none' }}
          />
        </div>
        
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginLeft: '4px' }}>Especialidade</label>
          <div style={{ position: 'relative' }}>
            <select 
              value={filtroEspecialidade}
              onChange={(e) => setFiltroEspecialidade(e.target.value)}
              style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #94a3b8', borderRadius: '8px', fontSize: '14px', padding: '10px 40px 10px 16px', color: '#1e293b', fontWeight: 600, outline: 'none', appearance: 'none' }}
            >
              {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <i className="las la-angle-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}></i>
          </div>
        </div>
        
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginLeft: '4px' }}>Buscar Paciente</label>
          <div style={{ position: 'relative' }}>
            <i className="las la-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }}></i>
            <input 
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Nome ou CPF..."
              style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #94a3b8', borderRadius: '8px', fontSize: '14px', padding: '10px 16px 10px 44px', color: '#1e293b', fontWeight: 600, outline: 'none' }}
            />
          </div>
        </div>

      </div>

      {/* TABELA DE AGENDAMENTOS */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden', position: 'relative', zIndex: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #94a3b8' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>Horário</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhes</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '100px' }}>Ações</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid #94a3b8' }}>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '64px 24px', textAlign: 'center' }}>
                    <i className="las la-spinner la-spin" style={{ fontSize: '36px', color: '#2563eb', marginBottom: '12px' }}></i>
                    <p style={{ color: '#475569', fontWeight: 600, fontSize: '14px', margin: 0 }}>Carregando agendamentos...</p>
                  </td>
                </tr>
              ) : erro ? (
                <tr><td colSpan={5} role="alert" style={{ padding: 48, textAlign: 'center', color: '#991b1b' }}>{erro}</td></tr>
              ) : agendamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '80px 24px', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '1px solid #94a3b8' }}>
                      <i className="las la-calendar-times" style={{ fontSize: '36px', color: '#64748b' }}></i>
                    </div>
                    <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '18px', margin: 0 }}>Nenhum agendamento</p>
                    <p style={{ color: '#475569', marginTop: '4px', fontSize: '14px' }}>Tente mudar os filtros ou a data selecionada acima.</p>
                  </td>
                </tr>
              ) : (
                agendamentosFiltrados.map((agenda) => {
                  const isPast = new Date(agenda.dataHora) < new Date();
                  const cor = getStatusColor(agenda.status);
                  const iniciais = agenda.paciente.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  
                  return (
                    <tr key={agenda.id} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: 'transparent', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', color: isPast && agenda.status === 'AGENDADO' ? '#dc2626' : '#1e293b' }}>
                          <i className="las la-clock" style={{ fontSize: '18px', opacity: 0.8 }}></i>
                          {new Date(agenda.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #94a3b8', fontSize: '14px' }}>
                            {iniciais}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>{agenda.paciente.nome}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                              {agenda.paciente.cpf && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="las la-id-card"></i> {agenda.paciente.cpf}</span>}
                              {agenda.paciente.telefone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><i className="las la-phone"></i> {agenda.paciente.telefone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 500 }}>
                          <span style={{ fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="las la-stethoscope" style={{ fontSize: '16px', opacity: 0.8 }}></i> {agenda.especialidade}
                          </span>
                          {agenda.profissional && <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="las la-user-md" style={{ fontSize: '16px', opacity: 0.8 }}></i> {agenda.profissional}</span>}
                          {agenda.sala && <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="las la-door-open" style={{ fontSize: '16px', opacity: 0.8 }}></i> {agenda.sala}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', border: '1px solid',
                          backgroundColor: cor.bg, color: cor.text, borderColor: cor.border 
                        }}>
                          {agenda.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button 
                          style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', backgroundColor: 'transparent', border: '1px solid transparent', cursor: 'pointer', margin: '0 auto', transition: 'all 0.2s' }}
                          onClick={() => setAgendaSelecionada(agenda)}
                          title="Opções"
                        >
                          <i className="las la-ellipsis-v" style={{ fontSize: '18px' }}></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AÇÕES RÁPIDAS */}
      {agendaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '384px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #334155', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #94a3b8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.25, margin: 0 }}>{agendaSelecionada.paciente.nome}</h3>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 0 0 0' }}>Opções de Atendimento</p>
              </div>
              <button 
                onClick={() => setAgendaSelecionada(null)} 
                style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginRight: '-8px' }}
              >
                <i className="las la-times" style={{ fontSize: '20px' }}></i>
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CONFIRMADO')}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', border: '1px solid #059669', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', cursor: 'pointer' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', color: '#059669' }}>
                  <i className="las la-check" style={{ fontSize: '18px' }}></i>
                </div>
                Confirmar Presença
              </button>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'EM_ATENDIMENTO')}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', border: '1px solid #2563eb', backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', cursor: 'pointer' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', color: '#2563eb' }}>
                  <i className="las la-stethoscope" style={{ fontSize: '18px' }}></i>
                </div>
                Iniciar Atendimento
              </button>

              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CONCLUIDO')}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', cursor: 'pointer' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', color: '#334155' }}>
                  <i className="las la-flag-checkered" style={{ fontSize: '18px' }}></i>
                </div>
                Finalizar Consulta
              </button>

              <div style={{ height: '1px', backgroundColor: '#94a3b8', margin: '4px 0' }}></div>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CANCELADO')}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', border: '1px solid transparent', backgroundColor: 'transparent', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="las la-trash-alt" style={{ fontSize: '18px' }}></i>
                </div>
                Cancelar Agendamento
              </button>

            </div>
          </div>
        </div>
      )}

      {criando && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCriando(false); }} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,.55)' }}>
          <form onSubmit={criarAgendamento} aria-labelledby="novo-agendamento-titulo" style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 id="novo-agendamento-titulo" style={{ gridColumn: '1 / -1', margin: 0, color: '#0f172a' }}>Novo agendamento</h3>
            {erro && <p role="alert" style={{ gridColumn: '1 / -1', color: '#b91c1c', margin: 0 }}>{erro}</p>}
            <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}>Paciente
              <select required name="pacienteId" defaultValue="" disabled={!pacientes.length} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }}><option value="" disabled>{pacientes.length ? 'Selecione o paciente' : 'Nenhum paciente disponível'}</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>Data<input required name="data" type="date" defaultValue={filtroData} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Horário<input required name="hora" type="time" style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Tipo<input required name="tipo" defaultValue="Consulta" maxLength={80} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Especialidade<input required name="especialidade" maxLength={100} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Profissional<input name="profissional" maxLength={120} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <label style={{ display: 'grid', gap: 6 }}>Sala<input name="sala" maxLength={80} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}>Observações<textarea name="observacoes" maxLength={1000} rows={3} style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => setCriando(false)} style={{ padding: '10px 16px' }}>Fechar</button><button disabled={salvando || pacientes.length === 0} type="submit" style={{ padding: '10px 16px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 6 }}>{salvando ? 'Salvando…' : 'Criar agendamento'}</button></div>
          </form>
        </div>
      )}

    </div>
  );
}

