'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Lightbulb,
  Star,
  AlertTriangle,
  Bug,
  Send,
  Reply
} from 'lucide-react';
import { PageHeader, StatGrid, StatCard, Panel, Badge, EmptyState, LoadingState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './feedback.css';

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

const TIPO_PLURAL: Record<TipoFeedback, string> = {
  sugestao: 'Sugestões',
  elogio: 'Elogios',
  reclamacao: 'Reclamações',
  bug: 'Bugs',
};

const ICON_CLASS: Record<TipoFeedback, string> = {
  sugestao: 'las la-lightbulb',
  elogio: 'las la-star',
  reclamacao: 'las la-exclamation-triangle',
  bug: 'las la-bug',
};

function mapearFeedback(item: { id?: unknown; mensagem?: unknown; tipo?: unknown; createdAt?: unknown; status?: unknown; usuario?: { nome?: string } } | null): Feedback {
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
  const hospitalId = session?.user?.hospitalId;
  const usuarioId = session?.user?.id;
  const isAdmin = session?.user?.cargo === 'ADMIN';
  
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
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

  const TIPOS = ['sugestao', 'elogio', 'reclamacao', 'bug'] as TipoFeedback[];

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-comment-dots" title="Feedback" subtitle="Envie sugestões, elogios, reclamações e relatos de erro." />

      {erro && <div role="alert" className="mod-aviso mod-aviso-erro">{erro}</div>}

      <StatGrid>
        {TIPOS.map(t => (
          <StatCard key={t} icon={ICON_CLASS[t]} value={stats[t]} label={TIPO_PLURAL[t]} />
        ))}
      </StatGrid>

      <div className="fb-grade">
        <Panel title="Envie sua opinião" icon="las la-pen">
          {enviado && (
            <p role="status" aria-live="polite" className="mod-aviso mod-aviso-sucesso">Feedback enviado. Obrigado.</p>
          )}

          <div className="ux-chips fb-tipos" role="group" aria-label="Tipo de feedback">
            {TIPOS.map(t => {
              const Icon = IconMap[t];
              return (
                <button key={t} type="button" className="ux-chip" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
                  <Icon aria-hidden="true" size={16} /> {TIPO_LABEL[t]}
                </button>
              );
            })}
          </div>

          <form onSubmit={enviarFeedback}>
            <div className="form-group">
              <label htmlFor="feedback-assunto">Assunto</label>
              <input
                id="feedback-assunto"
                type="text"
                value={assunto}
                onChange={e => setAssunto(e.target.value)}
                placeholder="Ex.: melhoria no prontuário"
                maxLength={160}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="feedback-mensagem">Mensagem</label>
              <textarea
                id="feedback-mensagem"
                rows={4}
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder="Descreva com detalhes"
                maxLength={3828}
                required
              />
            </div>

            <div className="ui-modal-foot">
              <button type="submit" disabled={enviando} className="btn btn-primary">
                <Send aria-hidden="true" size={16} /> {enviando ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Feedbacks recebidos" icon="las la-list">
          <div className="ux-chips fb-filtros" role="group" aria-label="Filtrar feedbacks">
            {(['todos', ...TIPOS] as const).map(f => (
              <button key={f} type="button" className="ux-chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                {f === 'todos' ? 'Todos' : TIPO_LABEL[f]}
              </button>
            ))}
          </div>

          {carregando ? (
            <LoadingState message="Carregando feedbacks..." />
          ) : lista.length === 0 ? (
            <EmptyState icon="las la-inbox" message="Nenhum feedback encontrado nesta categoria." />
          ) : (
            <ul className="ux-lista fb-lista">
              {lista.map(f => {
                const data = new Date(f.data);
                const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR').slice(0, 5);
                const Icon = IconMap[f.tipo];

                return (
                  <li key={f.id} className="fb-item">
                    <div className="fb-item-topo">
                      <Badge tone={f.tipo === 'bug' ? 'danger' : 'neutral'}><Icon aria-hidden="true" size={12} /> {TIPO_LABEL[f.tipo]}</Badge>
                      <span className="ux-secundario">{dataStr}</span>
                    </div>
                    <h3>{f.assunto}</h3>
                    <p className="ux-secundario">{f.usuario}</p>
                    <p className="fb-mensagem">{f.mensagem}</p>

                    {f.respondido && f.resposta && (
                      <div className="ui-modal-box">
                        <strong>Resposta da equipe</strong>
                        <p className="ux-texto-longo">{f.resposta}</p>
                      </div>
                    )}

                    {isAdmin && !f.respondido && (
                      <button type="button" onClick={() => { setModalFeedback(f); setRespostaTexto(''); }} className="btn btn-secondary btn-sm">
                        <Reply aria-hidden="true" size={14} /> Responder
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {modalFeedback && (
        <Modal title="Responder feedback" icon="las la-reply" onClose={() => setModalFeedback(null)} busy={respondendo}>
          <div className="ui-modal-box">
            <strong>{modalFeedback.assunto}</strong>
            <p className="ux-texto-longo">{modalFeedback.mensagem}</p>
          </div>

          <div className="form-group">
            <label htmlFor="feedback-resposta">Sua resposta</label>
            <textarea
              id="feedback-resposta"
              rows={4}
              value={respostaTexto}
              onChange={e => setRespostaTexto(e.target.value)}
              placeholder="Resposta oficial da instituição"
              maxLength={2000}
            />
          </div>

          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={() => setModalFeedback(null)} disabled={respondendo}>Cancelar</button>
            <button onClick={enviarResposta} type="button" disabled={!respostaTexto.trim() || respondendo} className="btn btn-primary">
              <Send aria-hidden="true" size={16} /> {respondendo ? 'Enviando…' : 'Enviar resposta'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
