'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Archive, Eye, Send, Trash2 } from 'lucide-react';
import { PageHeader, Tabs, Badge, EmptyState, LoadingState, ErrorState, type Tone } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './suporte.css';

const TONE_STATUS: Record<string, Tone> = { 'Enviado': 'warning', 'Em Análise': 'info', 'Concluído': 'success', 'Finalizado': 'neutral' };
const TONE_PRIORIDADE: Record<string, Tone> = { 'Baixa': 'neutral', 'Média': 'info', 'Alta': 'warning', 'Urgente': 'danger' };

interface Resposta {
  respondente: string;
  data: string;
  resposta: string;
}

interface Ticket {
  id: string;
  numero: string;
  titulo: string;
  descricao: string;
  status: 'Enviado' | 'Em Análise' | 'Concluído' | 'Finalizado';
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  data: string;
  solicitante: string;
  respostas: Resposta[];
  arquivado: boolean;
}

export default function SuportePage() {
  const { data: session, status: sessionStatus } = useSession();
  const hospitalId = session?.user?.hospitalId;
  const usuario = session?.user;
  const isAdmin = usuario?.cargo === 'ADMIN';
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [filtroAtual, setFiltroAtual] = useState<'andamento' | 'arquivados'>('andamento');
  
  // Modals
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [ticketDetalhe, setTicketDetalhe] = useState<Ticket | null>(null);
  
  // Form Novo Ticket
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState<Ticket['prioridade']>('Média');
  
  // Alerts
  const [alertMsg, setAlertMsg] = useState<{ texto: string, tipo: 'sucesso' | 'erro' } | null>(null);

  const mapStatus = (s: string) => {
    const m: Record<string, string> = { 'ENVIADO': 'Enviado', 'EM_ANALISE': 'Em Análise', 'RESOLVIDO': 'Concluído', 'FECHADO': 'Finalizado' };
    return (m[s] || s) as Ticket['status'];
  };
  const mapPrioridade = (p: string) => {
    const m: Record<string, string> = { 'BAIXA': 'Baixa', 'MEDIA': 'Média', 'ALTA': 'Alta', 'URGENTE': 'Urgente' };
    return (m[p] || p) as Ticket['prioridade'];
  };

  // Carregar Tickets
  const carregarTickets = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch('/api/tickets');
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error || 'Não foi possível carregar os tickets.');
      if (!Array.isArray(data)) throw new Error('A resposta dos tickets é inválida.');
      const mapped = (data as { id: string; numero?: number | string; titulo: string; descricao: string; status: string; prioridade: string; createdAt: string; solicitante: string; respostas?: unknown }[]).map(t => ({
        id: String(t.id),
        numero: `SUP-${t.numero || String(t.id).slice(0, 6)}`,
        titulo: t.titulo,
        descricao: t.descricao,
        status: mapStatus(t.status),
        prioridade: mapPrioridade(t.prioridade),
        data: t.createdAt,
        solicitante: t.solicitante,
        respostas: Array.isArray(t.respostas) ? t.respostas : [],
        arquivado: t.status === 'FECHADO'
      }));
      setTickets(mapped);
      setErroCarga('');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar os tickets.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const mapPrioridadeToEnum = (p: string) => {
    const m: Record<string, string> = { 'Baixa': 'BAIXA', 'Média': 'MEDIA', 'Alta': 'ALTA', 'Urgente': 'URGENTE' };
    return m[p] || 'MEDIA';
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!hospitalId) {
      void Promise.resolve().then(() => { setTickets([]); });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setCarregando(false);
      return;
    }
    void carregarTickets();
  }, [hospitalId, sessionStatus, carregarTickets]);

  const showAlert = (texto: string, tipo: 'sucesso' | 'erro') => {
    setAlertMsg({ texto, tipo });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const criarTicket = async () => {
    if (!novoTitulo.trim() || !novaDescricao.trim()) {
      showAlert('Preencha título e descrição.', 'erro');
      return;
    }
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: novoTitulo,
          descricao: novaDescricao,
          prioridade: mapPrioridadeToEnum(novaPrioridade)
        })
      });
      if (res.ok) {
        const novo = await res.json();
        carregarTickets();
        setIsModalNovoOpen(false);
        setNovoTitulo('');
        setNovaDescricao('');
        setNovaPrioridade('Média');
        showAlert(`Solicitação enviada. Protocolo: SUP-${novo.numero || novo.id.slice(0,6)}`, 'sucesso');
      } else {
        showAlert('Erro ao criar ticket.', 'erro');
      }
    } catch {
      showAlert('Falha na conexão.', 'erro');
    }
  };

  const excluirTicket = async (id: string) => {
    const senha = prompt("Ação destrutiva! Digite sua senha para confirmar a exclusão deste ticket:");
    if (senha === null) return;
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Não foi possível excluir o ticket.');
      await carregarTickets();
      setTicketDetalhe(null);
      showAlert('Ticket excluído com sucesso.', 'sucesso');
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Erro ao excluir.', 'erro');
    }
  };

  const arquivarTicket = async (id: number | string) => {
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FECHADO' })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Não foi possível arquivar o ticket.');
      await carregarTickets();
      setTicketDetalhe(null);
      showAlert('Ticket arquivado com sucesso.', 'sucesso');
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Erro ao arquivar.', 'erro');
    }
  };

  const andamentoCount = tickets.filter(t => !t.arquivado && t.status !== 'Finalizado' && t.status !== 'Concluído').length;
  const arquivadosCount = tickets.filter(t => t.arquivado || t.status === 'Concluído').length;

  const ticketsFiltrados = tickets.filter(t => 
    filtroAtual === 'andamento' 
      ? (!t.arquivado && t.status !== 'Finalizado' && t.status !== 'Concluído') 
      : (t.arquivado || t.status === 'Concluído')
  );

  const abas = [
    { id: 'andamento', label: `Em andamento (${andamentoCount})`, icon: 'las la-ticket-alt' },
    { id: 'arquivados', label: `Concluídos e arquivados (${arquivadosCount})`, icon: 'las la-archive' },
  ] as const;

  return (
    <main className="mod-pagina">
      <PageHeader
        icon="las la-headset"
        title="Suporte"
        subtitle="Solicitações de suporte da sua conta."
        actions={<button type="button" className="btn btn-primary" onClick={() => setIsModalNovoOpen(true)}><i className="las la-plus-circle" aria-hidden="true"></i> Nova solicitação</button>}
      />

      {alertMsg && (
        <p role={alertMsg.tipo === 'erro' ? 'alert' : 'status'} className={`mod-aviso ${alertMsg.tipo === 'sucesso' ? 'mod-aviso-sucesso' : 'mod-aviso-erro'}`}>{alertMsg.texto}</p>
      )}

      <Tabs label="Filtrar tickets" tabs={abas} active={filtroAtual} onChange={setFiltroAtual} />

      {erroCarga && <ErrorState message={erroCarga} onRetry={() => void carregarTickets()} />}
      {carregando ? (
        <LoadingState message="Carregando tickets..." />
      ) : erroCarga ? null : ticketsFiltrados.length === 0 ? (
        <EmptyState icon="las la-inbox" message="Nenhum ticket encontrado. Use “Nova solicitação” para abrir um chamado." />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr><th>Protocolo</th><th>Título</th><th>Prioridade</th><th>Status</th><th>Data</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {ticketsFiltrados.map(ticket => (
                <tr key={ticket.id}>
                  <td><strong>{ticket.numero}</strong></td>
                  <td className="sup-titulo">{ticket.titulo}</td>
                  <td><Badge tone={TONE_PRIORIDADE[ticket.prioridade]}>{ticket.prioridade}</Badge></td>
                  <td><Badge tone={TONE_STATUS[ticket.status]}>{ticket.status}</Badge></td>
                  <td>{new Date(ticket.data).toLocaleString('pt-BR')}</td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => setTicketDetalhe(ticket)} title="Ver detalhes" aria-label={`Ver detalhes do ticket ${ticket.numero}`}>
                      <Eye aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalNovoOpen && (
        <Modal title="Nova solicitação" icon="las la-ticket-alt" onClose={() => setIsModalNovoOpen(false)}>
          <div className="form-group">
            <label htmlFor="suporte-novo-titulo-input">Título</label>
            <input
              id="suporte-novo-titulo-input"
              type="text"
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              placeholder="Ex.: problema com acesso ao sistema"
              maxLength={160}
            />
          </div>
          <div className="form-group">
            <label htmlFor="suporte-nova-descricao">Descrição</label>
            <textarea
              id="suporte-nova-descricao"
              rows={4}
              value={novaDescricao}
              onChange={e => setNovaDescricao(e.target.value)}
              placeholder="Descreva o problema ou a solicitação"
              maxLength={4000}
            />
          </div>
          <div className="form-group">
            <label htmlFor="suporte-nova-prioridade">Prioridade</label>
            <select
              id="suporte-nova-prioridade"
              value={novaPrioridade}
              onChange={e => setNovaPrioridade(e.target.value as Ticket['prioridade'])}
            >
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
          <p role="status" className="ux-secundario">Anexos não estão disponíveis neste módulo.</p>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalNovoOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={criarTicket}>
              <Send aria-hidden="true" size={16} /> Enviar
            </button>
          </div>
        </Modal>
      )}

      {ticketDetalhe && (
        <Modal size="lg" title="Detalhes do ticket" icon="las la-ticket-alt" onClose={() => setTicketDetalhe(null)}>
          <dl className="sup-dados">
            <div><dt>Protocolo</dt><dd><strong>{ticketDetalhe.numero}</strong></dd></div>
            <div><dt>Status</dt><dd><Badge tone={TONE_STATUS[ticketDetalhe.status]}>{ticketDetalhe.status}</Badge></dd></div>
            <div><dt>Prioridade</dt><dd><Badge tone={TONE_PRIORIDADE[ticketDetalhe.prioridade]}>{ticketDetalhe.prioridade}</Badge></dd></div>
            <div><dt>Data</dt><dd>{new Date(ticketDetalhe.data).toLocaleString('pt-BR')}</dd></div>
            <div><dt>Solicitante</dt><dd>{ticketDetalhe.solicitante}</dd></div>
          </dl>

          <h3 className="sup-subtitulo">{ticketDetalhe.titulo}</h3>
          <div className="ui-modal-box ux-texto-longo">{ticketDetalhe.descricao}</div>

          <h3 className="sup-subtitulo">Histórico de respostas</h3>
          {ticketDetalhe.respostas.length === 0 ? (
            <p className="ux-mudo">Nenhuma resposta ainda.</p>
          ) : (
            <ul className="ux-lista">
              {ticketDetalhe.respostas.map((r, i) => (
                <li key={i}>
                  <span className="ux-secundario">{r.respondente} · {new Date(r.data).toLocaleString('pt-BR')}</span>
                  <span className="ux-texto-longo">{r.resposta}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="ui-modal-foot">
            {!ticketDetalhe.arquivado && isAdmin && (
              <button type="button" className="btn btn-secondary" onClick={() => arquivarTicket(ticketDetalhe.id)}>
                <Archive aria-hidden="true" size={16} /> Arquivar
              </button>
            )}
            <button type="button" className="btn btn-danger" onClick={() => excluirTicket(ticketDetalhe.id)}>
              <Trash2 aria-hidden="true" size={16} /> Excluir
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
