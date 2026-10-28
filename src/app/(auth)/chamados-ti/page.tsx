'use client';

import { useState, useEffect } from 'react';
import './chamados-ti.css';

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
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

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
      setFormError('Preencha o título e a descrição do chamado.');
      return;
    }

    setFormError('');
    setSuccess('');
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
        setSuccess('Chamado enviado com sucesso.');
      } else {
        throw new Error(data?.error || 'Erro ao abrir chamado.');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Erro de conexão.');
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
    <div className="chamados-ti-page">
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-headset"></i> HelpDesk / Chamados TI</h2>
          <p>Suporte técnico e manutenção predial do hospital</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)} disabled={saving} aria-expanded={showForm}>
            <i className="las la-plus" aria-hidden="true"></i> {showForm ? 'Fechar formulário' : 'Abrir Chamado'}
          </button>
        </div>
      </div>

      {success && <p className="ticket-feedback ticket-feedback-success" role="status">{success}</p>}

      {showForm && (
        <form id="ticket-form" className="card ticket-form" onSubmit={(event) => { event.preventDefault(); void abrirChamado(); }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Novo Chamado de Suporte</h3>
          <div className="ticket-form-grid">
            <div className="ticket-field ticket-field-full">
              <label htmlFor="ticket-titulo">Problema (Título resumido) *</label>
              <input id="ticket-titulo" name="titulo" type="text" maxLength={160} required aria-required="true" className="input-field" placeholder="Ex: Impressora da Recepção não funciona" value={titulo} onChange={(e) => { setTitulo(e.target.value); setFormError(''); }} />
            </div>
            
            <div className="ticket-field">
              <label htmlFor="ticket-prioridade">Prioridade</label>
              <select id="ticket-prioridade" name="prioridade" className="input-field" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                <option value="BAIXA">Baixa - Pode esperar</option>
                <option value="MEDIA">Média - Atrapalha a rotina</option>
                <option value="ALTA">Alta - Urgente</option>
                <option value="URGENTE">Crítica - Risco ao Paciente</option>
              </select>
            </div>

            <div className="ticket-field ticket-field-full">
              <label htmlFor="ticket-descricao">Descrição detalhada *</label>
              <textarea id="ticket-descricao" name="descricao" rows={4} maxLength={4000} required aria-required="true" className="input-field" placeholder="Descreva o que está acontecendo..." value={descricao} onChange={(e) => { setDescricao(e.target.value); setFormError(''); }} />
            </div>
          </div>

          {formError && <p className="ticket-feedback ticket-feedback-error" role="alert">{formError}</p>}
          
          <div className="ticket-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Painel de Tickets</h3>
        
        {loading ? (
          <p role="status" aria-live="polite">Carregando chamados...</p>
        ) : erro ? (
          <div className="ticket-load-error" role="alert"><span>{erro}</span><button type="button" className="btn btn-primary" onClick={() => void carregarDados()}>Tentar novamente</button></div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="las la-smile" style={{ fontSize: '48px', marginBottom: '10px', color: '#10b981' }}></i>
            <p>Tudo funcionando perfeitamente! Nenhum chamado aberto.</p>
          </div>
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela" aria-label="Chamados de suporte técnico">
              <thead>
                <tr>
                  <th scope="col">Ticket</th>
                  <th scope="col">Solicitante</th>
                  <th scope="col">Prioridade</th>
                  <th scope="col">Status</th>
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
                      <div className="ticket-description">
                        {ticket.descricao}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#475569' }}><i className="las la-user" aria-hidden="true"></i> {ticket.solicitante}</div>
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
