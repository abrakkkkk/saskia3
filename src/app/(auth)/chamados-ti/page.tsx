'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Panel, Badge, EmptyState, LoadingState, ErrorState, type Tone } from '@/components/ui';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import '@/components/ui/modal.css';
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
    void Promise.resolve().then(() => { carregarDados(); });
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

  const tonePrioridade: Record<string, Tone> = { BAIXA: 'neutral', MEDIA: 'info', ALTA: 'warning', URGENTE: 'danger' };
  const toneStatus: Record<string, Tone> = { ENVIADO: 'warning', EM_ANALISE: 'info', RESOLVIDO: 'success', FECHADO: 'neutral' };

  const statusLabel: Record<string, string> = {
    ENVIADO: 'Enviado',
    EM_ANALISE: 'Em análise',
    RESOLVIDO: 'Resolvido',
    FECHADO: 'Fechado',
  };

  const prioridadeLabel: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Crítica',
  };

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-headset"
        title="Chamados de TI"
        subtitle="Suporte técnico e manutenção predial do hospital."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)} disabled={saving} aria-expanded={showForm}>
            <i className="las la-plus" aria-hidden="true"></i> {showForm ? 'Fechar formulário' : 'Abrir chamado'}
          </button>
        }
      />

      {success && <p className="mod-aviso mod-aviso-sucesso" role="status">{success}</p>}

      {showForm && (
        <Panel title="Novo chamado" icon="las la-plus-circle">
          <form id="ticket-form" onSubmit={(event) => { event.preventDefault(); void abrirChamado(); }}>
            <div className="ux-campos">
              <div className="form-group ux-largo">
                <label htmlFor="ticket-titulo">Problema (título resumido) *</label>
                <input id="ticket-titulo" name="titulo" type="text" maxLength={160} required aria-required="true" placeholder="Ex.: impressora da recepção não funciona" value={titulo} onChange={(e) => { setTitulo(e.target.value); setFormError(''); }} />
              </div>

              <div className="form-group">
                <label htmlFor="ticket-prioridade">Prioridade</label>
                <select id="ticket-prioridade" name="prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                  <option value="BAIXA">Baixa: pode esperar</option>
                  <option value="MEDIA">Média: atrapalha a rotina</option>
                  <option value="ALTA">Alta: urgente</option>
                  <option value="URGENTE">Crítica: risco ao paciente</option>
                </select>
              </div>

              <div className="form-group ux-largo">
                <label htmlFor="ticket-descricao">Descrição *</label>
                <textarea id="ticket-descricao" name="descricao" rows={4} maxLength={4000} required aria-required="true" placeholder="Descreva o que está acontecendo" value={descricao} onChange={(e) => { setDescricao(e.target.value); setFormError(''); }} />
              </div>
            </div>

            {formError && <p className="mod-aviso mod-aviso-erro" role="alert">{formError}</p>}

            <div className="ui-modal-foot">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enviando…' : 'Enviar chamado'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {loading ? (
        <LoadingState message="Carregando chamados..." />
      ) : erro ? (
        <ErrorState message={erro} onRetry={() => void carregarDados()} />
      ) : tickets.length === 0 ? (
        <EmptyState icon="las la-headset" message="Você ainda não abriu nenhum chamado." />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela" aria-label="Chamados de suporte técnico">
            <thead>
              <tr>
                <th scope="col">Chamado</th>
                <th scope="col">Solicitante</th>
                <th scope="col">Prioridade</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td className="ti-chamado">
                    <strong>{ticket.titulo}</strong>
                    <span className="ux-secundario">{ticket.descricao}</span>
                  </td>
                  <td>
                    {ticket.solicitante}
                    <span className="ux-secundario">{new Date(ticket.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </td>
                  <td><Badge tone={tonePrioridade[ticket.prioridade] ?? 'neutral'}>{prioridadeLabel[ticket.prioridade] || ticket.prioridade}</Badge></td>
                  <td><Badge tone={toneStatus[ticket.status] ?? 'neutral'}>{statusLabel[ticket.status] || ticket.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
