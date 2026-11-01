'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styles from './feedback.module.css';
import { 
  MessageSquare, 
  Lightbulb, 
  Star, 
  AlertTriangle, 
  Bug, 
  Tag, 
  Send, 
  List, 
  Inbox, 
  Calendar, 
  User, 
  Reply,
  CheckCircle
} from 'lucide-react';

type TipoFeedback = 'sugestao' | 'elogio' | 'reclamacao' | 'bug';

interface Feedback {
  id: string;
  tipo: TipoFeedback;
  assunto: string;
  mensagem: string;
  data: string;
  usuario: string;
  respondido: boolean;
  resposta: string | null;
}

const TIPO_LABEL: Record<TipoFeedback, string> = {
  sugestao: 'Sugestão',
  elogio: 'Elogio',
  reclamacao: 'Reclamação',
  bug: 'Bug',
};

const TIPO_COLORS: Record<TipoFeedback, { bg: string, text: string, border: string }> = {
  sugestao: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
  elogio: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-500' },
  reclamacao: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-500' },
  bug: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' },
};

function mapearFeedback(item: any): Feedback {
  const texto = typeof item?.mensagem === 'string' ? item.mensagem : '';
  const marcadorResposta = '\n\n[RESPOSTA DA EQUIPE]:';
  const separadorResposta = texto.indexOf(marcadorResposta);
  const conteudo = separadorResposta >= 0 ? texto.slice(0, separadorResposta) : texto;
  const resposta = separadorResposta >= 0 ? texto.slice(separadorResposta + marcadorResposta.length).trim() : null;
  const marcadorAssunto = '\n[ASSUNTO]:';
  const separadorAssunto = conteudo.lastIndexOf(marcadorAssunto);
  const legado = conteudo.match(/\s\(([^()]*)\)$/);
  const mensagem = separadorAssunto >= 0
    ? conteudo.slice(0, separadorAssunto).trim()
    : legado ? conteudo.slice(0, legado.index).trim() : conteudo.trim();
  const assunto = separadorAssunto >= 0
    ? conteudo.slice(separadorAssunto + marcadorAssunto.length).trim()
    : legado?.[1]?.trim() || 'Mensagem';
  const tipoNormalizado = typeof item?.tipo === 'string' ? item.tipo.toLowerCase() : 'sugestao';
  const tipo = Object.prototype.hasOwnProperty.call(TIPO_LABEL, tipoNormalizado) ? tipoNormalizado as TipoFeedback : 'sugestao';

  return {
    id: String(item?.id || ''),
    tipo,
    assunto,
    mensagem,
    data: typeof item?.createdAt === 'string' ? item.createdAt : '',
    usuario: item?.usuario?.nome || 'Profissional',
    respondido: item?.status === 'RESPONDIDO',
    resposta,
  };
}

export default function FeedbackPage() {
  const { data: session, status: sessionStatus } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuarioId = session?.user?.id;
  const isAdmin = (session?.user as any)?.cargo === 'ADMIN';
  
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filtro, setFiltro] = useState<TipoFeedback | 'todos'>('todos');
  
  // Form State
  const [tipo, setTipo] = useState<TipoFeedback>('sugestao');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  
  // Modal State
  const [modalFeedback, setModalFeedback] = useState<Feedback | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  
  // Alert State
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respondendo, setRespondendo] = useState(false);

  const carregarFeedbacks = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Não foi possível carregar feedbacks.');
      if (!Array.isArray(data)) throw new Error('A resposta de feedbacks é inválida.');
      setFeedbacks(data.map(mapearFeedback));
    } catch (error) {
      setFeedbacks([]);
      setErro(error instanceof Error ? error.message : 'Erro ao carregar feedbacks.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!hospitalId || !usuarioId) {
      setFeedbacks([]);
      setErro('Faça login para acessar os feedbacks.');
      setCarregando(false);
      return;
    }
    void carregarFeedbacks();
  }, [hospitalId, usuarioId, sessionStatus, carregarFeedbacks]);

  const enviarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    if (!assunto.trim() || !mensagem.trim()) {
      setErro('Preencha o assunto e a mensagem antes de enviar.');
      return;
    }
    setEnviando(true);
    setErro('');
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipo.toUpperCase(),
          mensagem: `${mensagem.trim()}\n[ASSUNTO]: ${assunto.trim()}`
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Não foi possível enviar o feedback.');
      setAssunto('');
      setMensagem('');
      setEnviado(true);
      void carregarFeedbacks();
      setTimeout(() => setEnviado(false), 3000);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro de conexão ao enviar feedback.');
    } finally {
      setEnviando(false);
    }
  };

  const enviarResposta = async () => {
    if (!respostaTexto.trim() || !modalFeedback || respondendo) return;
    setRespondendo(true);
    
    try {
      const res = await fetch(`/api/feedback/${modalFeedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESPONDIDO',
          resposta: respostaTexto.trim()
        })
      });

      if (res.ok) {
        setModalFeedback(null);
        setRespostaTexto('');
        void carregarFeedbacks();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Apenas administradores podem responder feedbacks.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar resposta.');
    } finally {
      setRespondendo(false);
    }
  };

  const lista = filtro === 'todos' ? feedbacks : feedbacks.filter(f => f.tipo === filtro);
  
  const stats = {
    sugestao: feedbacks.filter(f => f.tipo === 'sugestao').length,
    elogio: feedbacks.filter(f => f.tipo === 'elogio').length,
    reclamacao: feedbacks.filter(f => f.tipo === 'reclamacao').length,
    bug: feedbacks.filter(f => f.tipo === 'bug').length,
  };

  const IconMap = {
    sugestao: Lightbulb,
    elogio: Star,
    reclamacao: AlertTriangle,
    bug: Bug
  };

  return (
    <div className={`${styles.root} max-w-[1200px] mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6`}>
      
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-[1.75rem] font-bold text-slate-800 flex items-center gap-2 leading-tight">
          <MessageSquare aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-blue-900" />
          Feedback / Sugestão
        </h2>
        <p className="text-slate-500 mt-1">Ajude-nos a melhorar o sistema enviando suas observações.</p>
      </div>

      {erro && <div role="alert" aria-live="assertive" className="rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50 p-3 sm:p-4 text-sm text-red-800 leading-relaxed">{erro}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['sugestao', 'elogio', 'reclamacao', 'bug'] as TipoFeedback[]).map(t => {
          const Icon = IconMap[t];
          return (
            <div key={t} className={`bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 ${TIPO_COLORS[t].border} flex min-w-0 flex-col items-center justify-center text-center`}>
              <h4 className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mb-2">
                <Icon aria-hidden="true" className="w-4 h-4 shrink-0" /> {TIPO_LABEL[t]}s
              </h4>
              <div className={`text-3xl font-bold ${TIPO_COLORS[t].text}`}>{stats[t]}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        
        {/* Form */}
        <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <MessageSquare aria-hidden="true" className="w-5 h-5 text-blue-900" /> Envie sua Opinião
          </h3>

          {enviado && (
            <div role="status" aria-live="polite" className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 mb-6 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle aria-hidden="true" className="w-5 h-5 shrink-0" /> Feedback enviado! Obrigado.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-5 sm:mb-6">
            {(['sugestao', 'elogio', 'reclamacao', 'bug'] as TipoFeedback[]).map(t => {
              const Icon = IconMap[t];
              const ativo = tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setTipo(t)}
                  className={`min-h-12 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors gap-1 ${ativo ? `${TIPO_COLORS[t].bg} ${TIPO_COLORS[t].border} ${TIPO_COLORS[t].text}` : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50'}`}
                >
                  <Icon aria-hidden="true" className="w-5 h-5" />
                  <span className="text-xs font-bold">{TIPO_LABEL[t]}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={enviarFeedback} className="space-y-4">
            <div>
              <label htmlFor="feedback-assunto" className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Assunto
              </label>
              <input
                id="feedback-assunto"
                type="text"
                value={assunto}
                onChange={e => setAssunto(e.target.value)}
                placeholder="Ex: Melhoria no prontuário"
                maxLength={160}
                required
                className="w-full min-h-11 border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="feedback-mensagem" className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Mensagem
              </label>
              <textarea
                id="feedback-mensagem"
                rows={4}
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder="Descreva detalhadamente..."
                maxLength={3828}
                required
                className="w-full min-h-28 border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 text-sm resize-y"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={enviando}
              className="w-full min-h-12 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 disabled:cursor-wait text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              <Send className="w-4 h-4" /> {enviando ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          
          <div className="bg-blue-900 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="font-bold flex items-center gap-2">
              <List aria-hidden="true" className="w-5 h-5 shrink-0" /> Feedbacks Recebidos
            </h3>
            
            <div className="flex max-w-full flex-wrap justify-center gap-1.5 bg-white/10 p-1 rounded-lg">
              {(['todos', 'sugestao', 'elogio', 'reclamacao', 'bug'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={`min-h-10 px-2.5 sm:px-3 py-2 rounded-md text-xs font-semibold transition-colors ${filtro === f ? 'bg-white text-blue-900 shadow-sm' : 'text-white hover:bg-white/20'}`}
                >
                  {f === 'todos' ? 'Todos' : TIPO_LABEL[f as TipoFeedback]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-3 sm:p-4 overflow-y-auto max-h-[70vh] lg:max-h-[600px]">
            {carregando ? (
              <p role="status" className="py-16 text-center text-slate-500">Carregando feedbacks...</p>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
                <Inbox aria-hidden="true" className="w-12 h-12 sm:w-16 sm:h-16 opacity-30" />
                <p>Nenhum feedback encontrado nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lista.map(f => {
                  const data = new Date(f.data);
                  const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR').slice(0, 5);
                  const Icon = IconMap[f.tipo];
                  
                  return (
                    <div key={f.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${TIPO_COLORS[f.tipo].bg} ${TIPO_COLORS[f.tipo].text}`}>
                          <Icon aria-hidden="true" className="w-3.5 h-3.5" /> {TIPO_LABEL[f.tipo]}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Calendar aria-hidden="true" className="w-3.5 h-3.5" /> {dataStr}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <h4 className="font-bold text-slate-800 text-lg">{f.assunto}</h4>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <User aria-hidden="true" className="w-3.5 h-3.5" /> {f.usuario}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">{f.mensagem}</p>
                      
                      {f.respondido && f.resposta && (
                        <div className="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-600 mb-4">
                          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Reply aria-hidden="true" className="w-3.5 h-3.5" /> Resposta da Equipe
                          </div>
                          <p className="text-sm text-slate-800">{f.resposta}</p>
                        </div>
                      )}
                      
                      {isAdmin && !f.respondido && (
                        <div>
                          <button
                            onClick={() => { setModalFeedback(f); setRespostaTexto(''); }}
                            className="min-h-10 text-xs font-bold text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                          >
                            <Reply aria-hidden="true" className="w-3.5 h-3.5" /> Responder
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Resposta */}
      {modalFeedback && (
        <div className="fixed inset-0 bg-slate-950/55 z-50 flex items-center justify-center p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" className="bg-white rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 id="feedback-modal-title" className="font-bold flex items-center gap-2"><Reply aria-hidden="true" className="w-5 h-5" /> Responder Feedback</h3>
              <button type="button" aria-label="Fechar janela" onClick={() => setModalFeedback(null)} className="min-h-10 min-w-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <h4 className="font-bold text-slate-800 mb-1">{modalFeedback.assunto}</h4>
                <p className="text-sm text-slate-600">{modalFeedback.mensagem}</p>
              </div>
              
              <label htmlFor="feedback-resposta" className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <MessageSquare aria-hidden="true" className="w-4 h-4" /> Sua Resposta
              </label>
              <textarea
                id="feedback-resposta"
                rows={4}
                value={respostaTexto}
                onChange={e => setRespostaTexto(e.target.value)}
                placeholder="Digite a resposta oficial da instituição para este feedback..."
                maxLength={2000}
                className="w-full min-h-28 border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 text-sm resize-y mb-6"
              />
              
              <button 
                onClick={enviarResposta}
                type="button"
                disabled={!respostaTexto.trim() || respondendo}
                className="w-full min-h-12 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <Send aria-hidden="true" className="w-4 h-4" /> {respondendo ? 'Enviando...' : 'Enviar Resposta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
