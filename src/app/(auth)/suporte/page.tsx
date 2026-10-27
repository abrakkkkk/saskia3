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
  CloudUpload,
  MessageSquareOff,
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
    <div className="max-w-[1500px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Headset className="w-8 h-8 text-blue-900" />
            Tickets de Suporte
          </h2>
          <p className="text-slate-500 mt-1">Gerencie todas as solicitações de suporte da sua conta.</p>
        </div>
        <button 
          onClick={() => setIsModalNovoOpen(true)}
          className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" /> Nova Solicitação
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-slate-200">
        <button 
          onClick={() => setFiltroAtual('andamento')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-[2px] ${filtroAtual === 'andamento' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Spinner className="w-4 h-4" /> Em Andamento ({andamentoCount})
        </button>
        <button 
          onClick={() => setFiltroAtual('arquivados')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-[2px] ${filtroAtual === 'arquivados' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Archive className="w-4 h-4" /> Arquivados ({arquivadosCount})
        </button>
      </div>

      {/* Lista Tickets */}
      <div className="min-h-[400px] space-y-4">
        {erroCarga && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{erroCarga}</p>}
        {carregando ? (
          <div role="status" className="flex items-center justify-center gap-2 py-20 text-slate-500"><Spinner className="h-5 w-5 animate-spin" /> Carregando tickets...</div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Inbox className="w-16 h-16 opacity-30" />
            <p className="text-lg">Nenhum ticket encontrado</p>
            <p className="text-sm">Clique em "Nova Solicitação" para abrir um chamado</p>
          </div>
        ) : (
          ticketsFiltrados.map(ticket => (
            <div 
              key={ticket.id} 
              className={`bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 ${getPrioridadeColor(ticket.prioridade)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <TicketIcon className="w-4 h-4" /> {ticket.numero}
                </span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getStatusColor(ticket.status)}`}>
                  {getPrioridadeIcon(ticket.prioridade)} {ticket.status}
                </span>
              </div>
              
              <h3 className="text-base font-semibold text-slate-900 mb-2">{ticket.titulo}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{ticket.descricao}</p>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(ticket.data).toLocaleString()}</span>
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {ticket.solicitante}</span>
                  <span className="flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> {ticket.prioridade}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setTicketDetalhe(ticket)}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Ticket */}
      {isModalNovoOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><TicketIcon className="w-5 h-5" /> Nova Solicitação</h3>
              <button onClick={() => setIsModalNovoOpen(false)} className="text-white/70 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Título da Solicitação</label>
                <input 
                  type="text" 
                  value={novoTitulo}
                  onChange={e => setNovoTitulo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  placeholder="Ex: Problema com acesso ao sistema"
                  maxLength={160}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descrição Detalhada</label>
                <textarea 
                  rows={4}
                  value={novaDescricao}
                  onChange={e => setNovaDescricao(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm resize-y"
                  placeholder="Descreva detalhadamente o problema ou solicitação..."
                  maxLength={4000}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Prioridade</label>
                <select 
                  value={novaPrioridade}
                  onChange={e => setNovaPrioridade(e.target.value as Ticket['prioridade'])}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                >
                  <option value="Baixa"> Baixa</option>
                  <option value="Média"> Média</option>
                  <option value="Alta"> Alta</option>
                  <option value="Urgente"> Urgente</option>
                </select>
              </div>

              <p role="status" className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Anexos não estão disponíveis para persistência neste módulo.</p>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={criarTicket}
                className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <CloudUpload className="w-5 h-5" /> Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {ticketDetalhe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><TicketIcon className="w-5 h-5" /> Detalhes do Ticket</h3>
              <button onClick={() => setTicketDetalhe(null)} className="text-white/70 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
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
                    <MessageSquareOff className="w-4 h-4" /> Nenhuma resposta ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ticketDetalhe.respostas.map((r, i) => (
                      <div key={i} className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-600">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1.5">
                          <User className="w-3 h-3" /> {r.respondente} <span className="mx-1">•</span> {new Date(r.data).toLocaleString()}
                        </div>
                        <p className="text-sm text-slate-800">{r.resposta}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              {!ticketDetalhe.arquivado && isAdmin && (
                <button 
                  onClick={() => arquivarTicket(ticketDetalhe.id)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" /> Arquivar
                </button>
              )}
              <button 
                onClick={() => excluirTicket(ticketDetalhe.id)}
                className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertMsg && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 text-white font-medium z-50 animate-in slide-in-from-bottom-5 ${alertMsg.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}>
          {alertMsg.tipo === 'sucesso' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {alertMsg.texto}
        </div>
      )}

    </div>
  );
}
