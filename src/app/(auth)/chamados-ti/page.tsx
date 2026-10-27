'use client';

import { useState, useEffect } from 'react';

interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
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
  const [prioridade, setPrioridade] = useState('MEDIA');
  const [showForm, setShowForm] = useState(false);
  const [erro, setErro] = useState('');
  const [saving, setSaving] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/tickets');
      const data: unknown = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        const mensagem = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Não foi possível carregar os chamados.';
        throw new Error(mensagem);
      }
      setTickets(data as Ticket[]);
    } catch (error) {
      setTickets([]);
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar os chamados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirChamado = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      alert('Preencha título e descrição.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), descricao: descricao.trim(), prioridade })
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        setTitulo(''); setDescricao(''); setPrioridade('MEDIA');
        setShowForm(false);
        await carregarDados();
      } else {
        throw new Error(data?.error || 'Erro ao abrir chamado.');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const getPrioridadeBadge = (prio: string) => {
    switch (prio) {
      case 'BAIXA': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'ALTA': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'URGENTE': return 'bg-red-100 text-red-800 border border-red-200 font-bold';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO': return 'bg-red-50 text-red-600 border border-red-200';
      case 'EM_ANALISE': return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'RESOLVIDO': return 'bg-green-50 text-green-600 border border-green-200';
      case 'FECHADO': return 'bg-gray-100 text-gray-500 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabel: Record<string, string> = {
    ENVIADO: 'Enviado',
    EM_ANALISE: 'Em análise',
    RESOLVIDO: 'Resolvido',
    FECHADO: 'Fechado',
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
              <label htmlFor="ticket-titulo" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Problema (Título Resumido)</label>
              <input id="ticket-titulo" name="titulo" type="text" maxLength={160} required className="input-field" placeholder="Ex: Impressora da Recepção não funciona" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            
            <div>
              <label htmlFor="ticket-prioridade" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Prioridade</label>
              <select id="ticket-prioridade" name="prioridade" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                <option value="BAIXA">Baixa - Pode esperar</option>
                <option value="MEDIA">Média - Atrapalha a rotina</option>
                <option value="ALTA">Alta - Urgente</option>
                <option value="URGENTE">Crítica - Risco ao Paciente</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="ticket-descricao" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Descrição Detalhada</label>
              <textarea id="ticket-descricao" name="descricao" rows={3} maxLength={4000} required className="input-field" placeholder="Descreva o que está acontecendo..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
            <button className="btn btn-primary" onClick={abrirChamado} disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Painel de Tickets</h3>
        
        {loading ? (
          <p>Carregando chamados...</p>
        ) : erro ? (
          <div role="alert" style={{ color: '#b91c1c', padding: '20px' }}>{erro}</div>
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
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="las la-headset text-blue-500" aria-hidden="true" style={{ fontSize: '18px' }}></i>
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
                         {ticket.prioridade === 'URGENTE' ? 'CRÍTICA' : ticket.prioridade}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadge(ticket.status)}`} style={{ padding: '4px 8px', borderRadius: '8px' }}>
                         {statusLabel[ticket.status] || ticket.status}
                      </span>
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
