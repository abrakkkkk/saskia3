'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PageHeader, StatGrid, StatCard, Badge, EmptyState, LoadingState, type Tone } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { pode } from '@/lib/permissions';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';

interface Ticket {
  id: string;
  numero: string;
  solicitante: string;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  data: string;
  respostas?: { data: string; resposta: string; respondente: string }[];
}

type TicketApi = { id: string; numero?: number | string; titulo: string; descricao: string; status: string; prioridade: string; createdAt: string; solicitante: string; respostas?: unknown };

const ATALHOS = [
  { href: '/admin-configuracao', icone: 'las la-building', titulo: 'Configuração', desc: 'Dados da instituição e logo' },
  { href: '/admin-procedimentos', icone: 'las la-syringe', titulo: 'Procedimentos', desc: 'Cadastro de procedimentos' },
  { href: '/admin-usuarios', icone: 'las la-users', titulo: 'Usuários', desc: 'Contas e cargos' },
  { href: '/admin-prontuarios', icone: 'las la-file-alt', titulo: 'Modelos de prontuário', desc: 'Registros padronizados' },
  { href: '/admin-config-dashboard', icone: 'las la-sliders-h', titulo: 'Dashboard', desc: 'Módulos exibidos' },
];

const TONE_STATUS: Record<string, Tone> = { 'Enviado': 'warning', 'Em Análise': 'info', 'Concluído': 'success', 'Finalizado': 'neutral' };
const TONE_PRIORIDADE: Record<string, Tone> = { 'Baixa': 'neutral', 'Média': 'info', 'Alta': 'warning', 'Urgente': 'danger' };

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = pode(session?.user?.cargo, 'admin:acesso');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [erroTickets, setErroTickets] = useState('');
  const [carregandoTickets, setCarregandoTickets] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [respostaStatus, setRespostaStatus] = useState('Enviado');
  const [salvandoResposta, setSalvandoResposta] = useState(false);
  const [mensagemResposta, setMensagemResposta] = useState('');
  const [erroResposta, setErroResposta] = useState('');

  const mapStatus = (s: string) => {
    const m: Record<string, string> = { 'ENVIADO': 'Enviado', 'EM_ANALISE': 'Em Análise', 'RESOLVIDO': 'Concluído', 'FECHADO': 'Finalizado' };
    return m[s] || s;
  };
  const mapStatusToEnum = (s: string) => {
    const m: Record<string, string> = { 'Enviado': 'ENVIADO', 'Em Análise': 'EM_ANALISE', 'Concluído': 'RESOLVIDO', 'Finalizado': 'FECHADO' };
    return m[s] || 'ENVIADO';
  };
  const mapPrioridade = (p: string) => {
    const m: Record<string, string> = { 'BAIXA': 'Baixa', 'MEDIA': 'Média', 'ALTA': 'Alta', 'URGENTE': 'Urgente' };
    return m[p] || p;
  };

  const fetchTickets = async () => {
    if (!isAdmin) return;
    setCarregandoTickets(true);
    try {
      const response = await fetch('/api/tickets', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os tickets.');
      if (!Array.isArray(data)) throw new Error('Resposta de tickets inválida.');
      setTickets((data as TicketApi[]).map(t => ({
        id: t.id,
        numero: `SUP-${t.numero || t.id.slice(0,6)}`,
        titulo: t.titulo,
        descricao: t.descricao,
        status: mapStatus(t.status),
        prioridade: mapPrioridade(t.prioridade),
        data: t.createdAt,
        solicitante: t.solicitante,
        respostas: Array.isArray(t.respostas) ? (t.respostas as Ticket['respostas']) : []
      })));
      setErroTickets('');
    } catch (error) {
      setErroTickets(error instanceof Error ? error.message : 'Erro ao carregar tickets.');
    } finally {
      setCarregandoTickets(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => { fetchTickets(); });
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchTickets();
    }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTickets só muda com isAdmin
  }, [isAdmin]);

  if (sessionStatus === 'authenticated' && !isAdmin) {
    return (
      <div className="mod-pagina">
        <PageHeader icon="las la-hospital" title="Painel administrativo" />
        <div role="alert" className="mod-aviso mod-aviso-erro">Acesso restrito a administradores do hospital.</div>
      </div>
    );
  }

  const abrirModal = (ticket: Ticket) => {
    setErroResposta('');
    setMensagemResposta('');
    setTicketSelecionado(ticket);
    setRespostaStatus(ticket.status);
    setRespostaTexto('');
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setTicketSelecionado(null);
  };

  const enviarResposta = async () => {
    if (!ticketSelecionado || salvandoResposta) return;
    if (!respostaTexto.trim()) {
      setErroResposta('Digite uma resposta antes de enviar.');
      return;
    }

    setSalvandoResposta(true);
    setErroResposta('');
    try {
      const response = await fetch(`/api/tickets/${ticketSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: mapStatusToEnum(respostaStatus),
          resposta: respostaTexto.trim()
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao enviar resposta.');
      await fetchTickets();
      fecharModal();
      setMensagemResposta(`Resposta enviada. Ticket atualizado para: ${respostaStatus}.`);
    } catch (error) {
      setErroResposta(error instanceof Error ? error.message : 'Erro ao enviar resposta.');
    } finally {
      setSalvandoResposta(false);
    }
  };

  const enviado = tickets.filter(t => t.status === "Enviado").length;
  const analise = tickets.filter(t => t.status === "Em Análise").length;
  const concluido = tickets.filter(t => t.status === "Concluído" || t.status === "Finalizado").length;

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-hospital" title="Painel administrativo" subtitle="Configuração do hospital, usuários e fila de suporte." />

      <nav className="ux-atalhos" aria-label="Áreas administrativas">
        {ATALHOS.map(a => (
          <Link key={a.href} href={a.href} className="ux-atalho">
            <span className="ux-atalho-icone"><i className={a.icone} aria-hidden="true"></i></span>
            <span>
              <strong>{a.titulo}</strong>
              <small>{a.desc}</small>
            </span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="admin-tickets-titulo">
        <h2 id="admin-tickets-titulo" className="ux-titulo-secao"><i className="las la-headset" aria-hidden="true"></i> Tickets de suporte</h2>

        {erroTickets && (
          <div role="alert" className="mod-aviso mod-aviso-erro">
            {erroTickets}{' '}
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchTickets} disabled={carregandoTickets}>Tentar novamente</button>
          </div>
        )}
        {mensagemResposta && <p role="status" className="mod-aviso mod-aviso-sucesso">{mensagemResposta}</p>}

        <StatGrid>
          <StatCard icon="las la-clock" value={enviado} label="Aguardando" tone="warning" alerta />
          <StatCard icon="las la-search" value={analise} label="Em análise" tone="info" />
          <StatCard icon="las la-check-circle" value={concluido} label="Concluídos" tone="success" />
          <StatCard icon="las la-list" value={tickets.length} label="Total" />
        </StatGrid>

        {carregandoTickets && tickets.length === 0 ? (
          <LoadingState message="Carregando tickets..." />
        ) : tickets.length === 0 ? (
          <EmptyState icon="las la-headset" message={erroTickets ? 'Não foi possível mostrar os tickets.' : 'Nenhum ticket encontrado.'} />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Solicitante</th>
                  <th>Título</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.numero}</strong></td>
                    <td>{t.solicitante}</td>
                    <td title={t.titulo}>{t.titulo.length > 40 ? t.titulo.substring(0, 40) + '…' : t.titulo}</td>
                    <td><Badge tone={TONE_PRIORIDADE[t.prioridade] ?? 'neutral'}>{t.prioridade}</Badge></td>
                    <td><Badge tone={TONE_STATUS[t.status] ?? 'neutral'}>{t.status}</Badge></td>
                    <td>{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span className="ux-acoes">
                        <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => abrirModal(t)} title="Ver detalhes" aria-label={`Ver detalhes do ticket ${t.numero}`}>
                          <i className="las la-eye" aria-hidden="true"></i>
                        </button>
                        <button type="button" className="btn btn-primary btn-sm ux-icon-btn" onClick={() => abrirModal(t)} title="Responder" aria-label={`Responder ao ticket ${t.numero}`}>
                          <i className="las la-reply" aria-hidden="true"></i>
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && ticketSelecionado && (
        <Modal title="Responder ticket" icon="las la-reply" onClose={fecharModal} busy={salvandoResposta}>
          <div className="ui-modal-box">
            <strong>{ticketSelecionado.numero}</strong>
            <p>{ticketSelecionado.titulo}</p>
            <p className="ux-texto-longo">{ticketSelecionado.descricao}</p>
          </div>

          {(ticketSelecionado.respostas ?? []).length > 0 && (
            <div className="ui-modal-box">
              <strong>Respostas anteriores</strong>
              {(ticketSelecionado.respostas ?? []).map((r, i) => (
                <p key={i}>{r.respondente}, {new Date(r.data).toLocaleString('pt-BR')}: {r.resposta}</p>
              ))}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="admin-ticket-reply">Resposta</label>
            <textarea
              id="admin-ticket-reply"
              rows={4}
              placeholder="Digite sua resposta..."
              value={respostaTexto}
              onChange={e => setRespostaTexto(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-ticket-status">Status</label>
            <select id="admin-ticket-status" value={respostaStatus} onChange={e => setRespostaStatus(e.target.value)}>
              <option value="Enviado">Enviado</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Concluído">Concluído</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>

          {erroResposta && <p role="alert" className="mod-aviso mod-aviso-erro">{erroResposta}</p>}
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={fecharModal} disabled={salvandoResposta}>Cancelar</button>
            <button type="button" className="btn btn-success" onClick={enviarResposta} disabled={salvandoResposta}>
              <i className="las la-paper-plane" aria-hidden="true"></i> {salvandoResposta ? 'Enviando…' : 'Enviar resposta'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
