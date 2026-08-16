'use client';

import { useState, useEffect } from 'react';

interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  prioridade: string;
  status: string;
  solicitante: string;
  createdAt: string;
}

export default function ChamadosTiPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('TI');
  const [prioridade, setPrioridade] = useState('MEDIA');
  const [showForm, setShowForm] = useState(false);

  const carregarDados = () => {
    setLoading(true);
    fetch('/api/tickets')
      .then(res => res.json())
      .then(data => {
        setTickets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirChamado = async () => {
    if (!titulo || !descricao) {
      alert('Preencha título e descrição.');
      return;
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, tipo, prioridade })
      });

      if (res.ok) {
        setTitulo(''); setDescricao(''); setTipo('TI'); setPrioridade('MEDIA');
        setShowForm(false);
        carregarDados();
      } else {
        alert('Erro ao abrir chamado.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const getPrioridadeBadge = (prio: string) => {
    switch (prio) {
      case 'BAIXA': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'ALTA': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'CRITICA': return 'bg-red-100 text-red-800 border border-red-200 font-bold';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ABERTO': return 'bg-red-50 text-red-600 border border-red-200';
      case 'EM_ANDAMENTO': return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'RESOLVIDO': return 'bg-green-50 text-green-600 border border-green-200';
      case 'CANCELADO': return 'bg-gray-100 text-gray-500 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const atualizarStatusFake = (id: string, currentStatus: string) => {
    const steps = ['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO'];
    const nextIdx = steps.indexOf(currentStatus) + 1;
    if (nextIdx >= steps.length) return;
    const newStatus = steps[nextIdx];
    
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-headset"></i> HelpDesk / Chamados TI</h2>
          <p>Suporte técnico e manutenção predial do hospital</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <i className="las la-plus"></i> Abrir Chamado
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Novo Chamado de Suporte</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Problema (Título Resumido)</label>
              <input type="text" className="input-field" placeholder="Ex: Impressora da Recepção não funciona" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Setor / Tipo</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="TI">Informática / TI</option>
                <option value="MANUTENCAO">Manutenção Predial (Elétrica, Ar Condicionado)</option>
                <option value="LIMPEZA">Limpeza</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Prioridade</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                <option value="BAIXA">Baixa - Pode esperar</option>
                <option value="MEDIA">Média - Atrapalha a rotina</option>
                <option value="ALTA">Alta - Urgente</option>
                <option value="CRITICA">Crítica - Risco ao Paciente</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Descrição Detalhada</label>
              <textarea rows={3} className="input-field" placeholder="Descreva o que está acontecendo..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
            <button className="btn btn-primary"  onClick={abrirChamado}>
              Enviar Solicitação
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Painel de Tickets</h3>
        
        {loading ? (
          <p>Carregando chamados...</p>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="las la-smile" style={{ fontSize: '48px', marginBottom: '10px', color: '#10b981' }}></i>
            <p>Tudo funcionando perfeitamente! Nenhum chamado aberto.</p>
          </div>
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Solicitante</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={ticket.tipo === 'TI' ? 'las la-laptop text-blue-500' : ticket.tipo === 'MANUTENCAO' ? 'las la-tools text-orange-500' : 'las la-broom text-green-500'} style={{ fontSize: '18px' }}></i>
                        {ticket.titulo}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.descricao}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#475569' }}><i className="las la-user"></i> {ticket.solicitante}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(ticket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${getPrioridadeBadge(ticket.prioridade)}`} style={{ padding: '4px 8px', borderRadius: '8px' }}>
                         {ticket.prioridade}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadge(ticket.status)}`} style={{ padding: '4px 8px', borderRadius: '8px' }}>
                         {ticket.status}
                      </span>
                    </td>
                    <td>
                      {ticket.status !== 'RESOLVIDO' && ticket.status !== 'CANCELADO' && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe' }}
                          onClick={() => atualizarStatusFake(ticket.id, ticket.status)}
                        >
                          <i className="las la-check"></i> Tratar
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
  );
}
