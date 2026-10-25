'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import './admin.css';

interface Ticket {
  id: number;
  numero: string;
  solicitante: string;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  data: string;
  respostas?: { data: string; resposta: string; respondente: string }[];
}

export default function AdminPage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [respostaStatus, setRespostaStatus] = useState('Enviado');

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

  const fetchTickets = () => {
    try {
      const u = JSON.stringify(getSessionUser());
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      fetch('/api/tickets')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTickets(data.map((t: any) => ({
              id: t.id,
              numero: `SUP-${t.numero || t.id.slice(0,6)}`,
              titulo: t.titulo,
              descricao: t.descricao,
              status: mapStatus(t.status),
              prioridade: mapPrioridade(t.prioridade),
              data: t.createdAt,
              solicitante: t.solicitante,
              respostas: t.respostas || []
            })));
          }
        })
        .catch(console.error);
    } catch(e) {}
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => {
      fetchTickets();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const abrirModal = (ticket: Ticket) => {
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
    if(!ticketSelecionado) return;
    if(!respostaTexto.trim()){
      alert("Digite uma resposta!");
      return;
    }

    const respostasAtuais = ticketSelecionado.respostas || [];
    const novasRespostas = [
      ...respostasAtuais, 
      { data: new Date().toISOString(), resposta: respostaTexto, respondente: "Administrador" }
    ];

    try {
      await fetch(`/api/tickets/${ticketSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: mapStatusToEnum(respostaStatus),
          respostas: novasRespostas 
        })
      });
      fetchTickets();
      fecharModal();
      alert(`Resposta enviada! Ticket atualizado para: ${respostaStatus}`);
    } catch {
      alert('Erro ao enviar resposta.');
    }
  };

  const verTicket = (ticket: Ticket) => {
    alert(`📋 TICKET ${ticket.numero}\n\nTítulo: ${ticket.titulo}\nDescrição: ${ticket.descricao}\nStatus: ${ticket.status}\nPrioridade: ${ticket.prioridade}\nSolicitante: ${ticket.solicitante}`);
  };

  const getPrioridadeClasse = (p: string) => {
    const c: any = { "Baixa":"prioridade-baixa", "Média":"prioridade-media", "Alta":"prioridade-alta", "Urgente":"prioridade-urgente" };
    return c[p] || "";
  };

  const getPrioridadeIcone = (p: string) => {
    const i: any = { "Baixa":"🟢", "Média":"🟡", "Alta":"🔴", "Urgente":"⚠️" };
    return i[p] || "📌";
  };

  const enviado = tickets.filter(t => t.status === "Enviado").length;
  const analise = tickets.filter(t => t.status === "Em Análise").length;
  const concluido = tickets.filter(t => t.status === "Concluído" || t.status === "Finalizado").length;

  return (
    <div className="conteudo">
      <h2><i className="las la-hospital"></i> Painel Administrativo</h2>
      <p>Gerencie toda a plataforma da Saskia Saúde Integrada.</p>

      <div className="dashboard-cards">
        <Link href="/admin-configuracao" className="card-admin">
          <i className="las la-building"></i>
          <h3>Configuração</h3>
          <p>Dados da instituição, logo, endereço</p>
        </Link>
        <Link href="/admin-procedimentos" className="card-admin">
          <i className="las la-syringe"></i>
          <h3>Procedimentos</h3>
          <p>Cadastre procedimentos médicos</p>
        </Link>
        <Link href="/admin-usuarios" className="card-admin">
          <i className="las la-users"></i>
          <h3>Usuários</h3>
          <p>Administradores, recepção, profissionais</p>
        </Link>
        <Link href="/admin-prontuarios" className="card-admin">
          <i className="las la-file-alt"></i>
          <h3>Modelos de Prontuários</h3>
          <p>Padronize os registros clínicos</p>
        </Link>
        <Link href="/admin-financeiro" className="card-admin">
          <i className="las la-coins"></i>
          <h3>Financeiro</h3>
          <p>Gestão de licenças e pagamentos</p>
        </Link>
        <Link href="/admin-config-dashboard" className="card-admin">
          <i className="las la-sliders-h"></i>
          <h3>Configurar Dashboard</h3>
          <p>Personalize os módulos</p>
        </Link>
      </div>

      <div className="secao-tickets">
        <h2><i className="las la-headset"></i> Tickets de Suporte</h2>
        <p>Gerencie as solicitações de suporte dos usuários do sistema.</p>

        <div className="tickets-resumo">
          <div className="card-resumo-ticket pendente">
            <h4><i className="las la-clock"></i> Aguardando</h4>
            <div className="numero">{enviado}</div>
          </div>
          <div className="card-resumo-ticket analise">
            <h4><i className="las la-search"></i> Em Análise</h4>
            <div className="numero">{analise}</div>
          </div>
          <div className="card-resumo-ticket concluido">
            <h4><i className="las la-check-circle"></i> Concluídos</h4>
            <div className="numero">{concluido}</div>
          </div>
          <div className="card-resumo-ticket total">
            <h4><i className="las la-chart-bar"></i> Total</h4>
            <div className="numero">{tickets.length}</div>
          </div>
        </div>

        <div className="lista-tickets-admin">
          <table>
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
              {tickets.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum ticket encontrado</td></tr>
              ) : (
                tickets.map(t => {
                  const statusClass = t.status === "Enviado" ? "status-Enviado" :
                                      t.status === "Em Análise" ? "status-Em-Análise" :
                                      t.status === "Concluído" ? "status-Concluído" : "status-Finalizado";
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.numero}</strong></td>
                      <td>{t.solicitante}</td>
                      <td>{t.titulo.length > 40 ? t.titulo.substring(0, 40) + '...' : t.titulo}</td>
                      <td className={getPrioridadeClasse(t.prioridade)}>
                        {getPrioridadeIcone(t.prioridade)} {t.prioridade}
                      </td>
                      <td><span className={`status-ticket ${statusClass}`}>{t.status}</span></td>
                      <td>{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <button className="btn-ver-ticket" onClick={() => verTicket(t)} title="Ver Detalhes">
                          <i className="las la-eye"></i>
                        </button>
                        <button className="btn-responder" onClick={() => abrirModal(t)} title="Responder">
                          <i className="las la-reply"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && ticketSelecionado && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="las la-reply"></i> Responder Ticket</h3>
              <button className="modal-close" onClick={fecharModal}>&times;</button>
            </div>
            <div className="modal-body">
              <label>Protocolo: <span>{ticketSelecionado.numero}</span></label>
              <div className="ticket-info-box">
                <strong>Solicitação:</strong>
                <p style={{marginTop:'5px', marginBottom:'10px'}}>{ticketSelecionado.titulo}</p>
                <strong>Descrição:</strong>
                <p style={{marginTop:'5px', fontSize:'13px', color:'#475569'}}>{ticketSelecionado.descricao}</p>
              </div>
              
              <label>Resposta / Atualização</label>
              <textarea 
                rows={4} 
                placeholder="Digite sua resposta..." 
                value={respostaTexto} 
                onChange={e => setRespostaTexto(e.target.value)}
              />
              
              <label>Atualizar Status</label>
              <select value={respostaStatus} onChange={e => setRespostaStatus(e.target.value)}>
                <option value="Enviado">Enviado</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Concluído">Concluído</option>
                <option value="Finalizado">Finalizado</option>
              </select>
              
              <button className="btn btn-success" onClick={enviarResposta} style={{width:'100%', justifyContent:'center', marginTop:'10px'}}>
                <i className="las la-paper-plane"></i> Enviar Resposta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
