'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Headset, 
  PlusCircle, 
  Loader2 as Spinner, 
  Archive, 
  Ticket as TicketIcon, 
  Eye, 
  User, 
  Calendar, 
  Flag,
  CheckCircle,
  AlertTriangle,
  Inbox,
  MessageSquareOff,
  Send,
  Trash2
} from 'lucide-react';

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
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;
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

  // Carregar Tickets
  const carregarTickets = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch('/api/tickets');
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error((data as any)?.error || 'Não foi possível carregar os tickets.');
      if (!Array.isArray(data)) throw new Error('A resposta dos tickets é inválida.');
      const mapped = data.map((t: any) => ({
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

  const mapStatus = (s: string) => {
    const m: Record<string, string> = { 'ENVIADO': 'Enviado', 'EM_ANALISE': 'Em Análise', 'RESOLVIDO': 'Concluído', 'FECHADO': 'Finalizado' };
    return (m[s] || s) as any;
  };
  const mapPrioridade = (p: string) => {
    const m: Record<string, string> = { 'BAIXA': 'Baixa', 'MEDIA': 'Média', 'ALTA': 'Alta', 'URGENTE': 'Urgente' };
    return (m[p] || p) as any;
  };
  const mapPrioridadeToEnum = (p: string) => {
    const m: Record<string, string> = { 'Baixa': 'BAIXA', 'Média': 'MEDIA', 'Alta': 'ALTA', 'Urgente': 'URGENTE' };
    return m[p] || 'MEDIA';
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!hospitalId) {
      setTickets([]);
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
      showAlert('Preencha título e descrição!', 'erro');
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
        showAlert(`Solicitação enviada com sucesso! Protocolo: SUP-${novo.numero || novo.id.slice(0,6)}`, 'sucesso');
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
  const arquivadosCount = tickets.filter(t => t.arquivado).length;

  const ticketsFiltrados = tickets.filter(t => 
    filtroAtual === 'andamento' 
      ? (!t.arquivado && t.status !== 'Finalizado' && t.status !== 'Concluído') 
      : t.arquivado
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enviado': return 'bg-amber-100 text-amber-800';
      case 'Em Análise': return 'bg-blue-100 text-blue-800';
      case 'Concluído': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  const getPrioridadeColor = (prio: string) => {
    switch (prio) {
      case 'Baixa': return 'border-green-500 text-green-600';
      case 'Média': return 'border-yellow-500 text-yellow-600';
      case 'Alta': return 'border-orange-500 text-orange-600';
      case 'Urgente': return 'border-red-600 text-red-600';
      default: return 'border-slate-400';
    }
  };

  const getPrioridadeIcon = (prio: string) => {
    switch (prio) {
      case 'Baixa': return '';
      case 'Média': return '';
      case 'Alta': return '';
      case 'Urgente': return '';
      default: return '';
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Headset aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-blue-900" />
            Tickets de Suporte
          </h2>
          <p className="text-slate-500 mt-1">Gerencie todas as solicitações de suporte da sua conta.</p>
        </div>
        <button 
          onClick={() => setIsModalNovoOpen(true)}
          className="min-h-11 w-full sm:w-auto justify-center bg-blue-900 hover:bg-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <PlusCircle aria-hidden="true" className="w-5 h-5" /> Nova Solicitação
        </button>
      </div>

      {/* Tabs */}
      <div role="group" aria-label="Filtrar tickets" className="flex gap-1 sm:gap-2 overflow-x-auto border-b-2 border-slate-200">
        <button 
          type="button"
          aria-pressed={filtroAtual === 'andamento'}
          onClick={() => setFiltroAtual('andamento')}
          className={`min-h-11 shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ${filtroAtual === 'andamento' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <TicketIcon aria-hidden="true" className="w-4 h-4" /> Em Andamento ({andamentoCount})
        </button>
        <button 
          type="button"
          aria-pressed={filtroAtual === 'arquivados'}
          onClick={() => setFiltroAtual('arquivados')}
          className={`min-h-11 shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ${filtroAtual === 'arquivados' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Archive aria-hidden="true" className="w-4 h-4" /> Arquivados ({arquivadosCount})
        </button>
      </div>

      {/* Lista Tickets */}
      <div className="min-h-[400px] space-y-4">
        {erroCarga && <p role="alert" aria-live="assertive" className="rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50 p-4 text-sm leading-relaxed text-red-800">{erroCarga}</p>}
        {carregando ? (
          <div role="status" className="flex items-center justify-center gap-2 py-20 text-slate-500"><Spinner aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> Carregando tickets...</div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-slate-500 gap-4 text-center">
            <Inbox aria-hidden="true" className="w-14 h-14 opacity-40" />
            <p className="text-lg">Nenhum ticket encontrado</p>
            <p className="text-sm">Clique em "Nova Solicitação" para abrir um chamado</p>
          </div>
        ) : (
          ticketsFiltrados.map(ticket => (
            <div 
              key={ticket.id} 
              className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none border border-slate-200 border-l-4 ${getPrioridadeColor(ticket.prioridade)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <TicketIcon aria-hidden="true" className="w-4 h-4" /> {ticket.numero}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                  {getPrioridadeIcon(ticket.prioridade)} {ticket.status}
                </span>
              </div>
              
              <h3 className="text-base font-semibold text-slate-900 mb-2">{ticket.titulo}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{ticket.descricao}</p>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Calendar aria-hidden="true" className="w-3.5 h-3.5" /> {new Date(ticket.data).toLocaleString()}</span>
                  <span className="flex items-center gap-1.5"><User aria-hidden="true" className="w-3.5 h-3.5" /> {ticket.solicitante}</span>
                  <span className="flex items-center gap-1.5"><Flag aria-hidden="true" className="w-3.5 h-3.5" /> {ticket.prioridade}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setTicketDetalhe(ticket)}
                    className="min-h-11 flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none"
                  >
                    <Eye aria-hidden="true" className="w-4 h-4" /> Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Ticket */}
      {isModalNovoOpen && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="suporte-novo-titulo" className="bg-white rounded-2xl w-full max-w-xl max-h-[90dvh] overflow-hidden shadow-2xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 id="suporte-novo-titulo" className="font-bold flex items-center gap-2"><TicketIcon aria-hidden="true" className="w-5 h-5" /> Nova Solicitação</h3>
              <button type="button" aria-label="Fechar janela" onClick={() => setIsModalNovoOpen(false)} className="min-w-11 min-h-11 rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors motion-reduce:transition-none text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 max-h-[calc(90dvh-145px)] overflow-y-auto overscroll-contain">
              <div>
                <label htmlFor="suporte-novo-titulo-input" className="block text-sm font-bold text-slate-700 mb-1">Título da Solicitação</label>
                <input 
                  id="suporte-novo-titulo-input"
                  type="text" 
                  value={novoTitulo}
                  onChange={e => setNovoTitulo(e.target.value)}
                  className="w-full min-h-11 border border-slate-300 rounded-lg p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-700 text-sm"
                  placeholder="Ex: Problema com acesso ao sistema"
                  maxLength={160}
                />
              </div>
              
              <div>
                <label htmlFor="suporte-nova-descricao" className="block text-sm font-bold text-slate-700 mb-1">Descrição Detalhada</label>
                <textarea 
                  id="suporte-nova-descricao"
                  rows={4}
                  value={novaDescricao}
                  onChange={e => setNovaDescricao(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-700 text-sm resize-y"
                  placeholder="Descreva detalhadamente o problema ou solicitação..."
                  maxLength={4000}
                />
              </div>
              
              <div>
                <label htmlFor="suporte-nova-prioridade" className="block text-sm font-bold text-slate-700 mb-1">Prioridade</label>
                <select 
                  id="suporte-nova-prioridade"
                  value={novaPrioridade}
                  onChange={e => setNovaPrioridade(e.target.value as Ticket['prioridade'])}
                  className="w-full min-h-11 border border-slate-300 rounded-lg p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-700 text-sm bg-white"
                >
                  <option value="Baixa"> Baixa</option>
                  <option value="Média"> Média</option>
                  <option value="Alta"> Alta</option>
                  <option value="Urgente"> Urgente</option>
                </select>
              </div>

              <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">Anexos não estão disponíveis para persistência neste módulo.</p>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={criarTicket}
                className="w-full min-h-11 bg-blue-900 hover:bg-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <Send aria-hidden="true" className="w-5 h-5" /> Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {ticketDetalhe && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="suporte-detalhe-titulo" className="bg-white rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-hidden shadow-2xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 id="suporte-detalhe-titulo" className="font-bold flex items-center gap-2"><TicketIcon aria-hidden="true" className="w-5 h-5" /> Detalhes do Ticket</h3>
              <button type="button" aria-label="Fechar janela" onClick={() => setTicketDetalhe(null)} className="min-w-11 min-h-11 rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors motion-reduce:transition-none text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-4 sm:p-6 max-h-[calc(90dvh-150px)] overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Protocolo</span>
                  <span className="font-bold text-slate-900">{ticketDetalhe.numero}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block ${getStatusColor(ticketDetalhe.status)}`}>
                    {ticketDetalhe.status}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Prioridade</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    {getPrioridadeIcon(ticketDetalhe.prioridade)} {ticketDetalhe.prioridade}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Data</span>
                  <span className="text-slate-700">{new Date(ticketDetalhe.data).toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-slate-500 text-xs mb-1">Solicitante</span>
                  <span className="text-slate-700 font-medium">{ticketDetalhe.solicitante}</span>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-6 mb-6">
                <h4 className="font-bold text-slate-900 mb-2">{ticketDetalhe.titulo}</h4>
                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">
                  {ticketDetalhe.descricao}
                </div>
              </div>
              
              
              <div className="border-t border-slate-200 pt-6">
                <span className="block font-bold text-slate-900 mb-4 text-sm">Histórico de Respostas</span>
                {ticketDetalhe.respostas.length === 0 ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-50 p-4 rounded-xl">
                    <MessageSquareOff aria-hidden="true" className="w-4 h-4" /> Nenhuma resposta ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ticketDetalhe.respostas.map((r, i) => (
                      <div key={i} className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-600">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1.5">
                          <User aria-hidden="true" className="w-3 h-3" /> {r.respondente} <span className="mx-1">•</span> {new Date(r.data).toLocaleString()}
                        </div>
                        <p className="text-sm text-slate-800">{r.resposta}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              {!ticketDetalhe.arquivado && isAdmin && (
                <button 
                  onClick={() => arquivarTicket(ticketDetalhe.id)}
                  className="w-full sm:w-auto min-h-11 justify-center px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Archive aria-hidden="true" className="w-4 h-4" /> Arquivar
                </button>
              )}
              <button 
                onClick={() => excluirTicket(ticketDetalhe.id)}
                  className="w-full sm:w-auto min-h-11 justify-center px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 aria-hidden="true" className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertMsg && (
        <div role={alertMsg.tipo === 'erro' ? 'alert' : 'status'} aria-live={alertMsg.tipo === 'erro' ? 'assertive' : 'polite'} className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md px-4 sm:px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 text-white font-medium z-50 animate-in slide-in-from-bottom-5 motion-reduce:animate-none ${alertMsg.tipo === 'sucesso' ? 'bg-green-700' : 'bg-red-700'}`}>
          {alertMsg.tipo === 'sucesso' ? <CheckCircle aria-hidden="true" className="w-5 h-5 shrink-0" /> : <AlertTriangle aria-hidden="true" className="w-5 h-5 shrink-0" />}
          {alertMsg.texto}
        </div>
      )}

    </main>
  );
}
