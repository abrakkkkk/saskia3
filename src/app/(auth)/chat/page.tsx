'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Send, Hash } from 'lucide-react';
import { PageHeader, SearchInput, EmptyState } from '@/components/ui';
import { CARGO_LABEL, type Cargo } from '@/lib/permissions';
import { useChatNaoLidas, EVENTO_CHAT } from '@/components/chat/ChatBadge';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './chat.css';

interface Contato {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  cor: string;
}

interface Canal {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
}

/** Quem está aberto: uma pessoa ou um canal de setor. */
type Destino = { tipo: 'pessoa'; contato: Contato } | { tipo: 'canal'; canal: Canal };

interface Mensagem {
  id: string;
  nome?: string;
  de: string;
  para: string;
  texto: string;
  data: string;
}

const CORES = ['#3b82f6','#10b981','#8b5cf6','#f97316','#ec4899','#14b8a6'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const chaveDoDestino = (d: Destino | null) => (d ? (d.tipo === 'pessoa' ? `p:${d.contato.email}` : `c:${d.canal.slug}`) : null);
const consultaDoDestino = (d: Destino) => (d.tipo === 'pessoa' ? `para=${encodeURIComponent(d.contato.email)}` : `canal=${encodeURIComponent(d.canal.slug)}`);

export default function ChatPage() {
  const { data: session, status: sessionStatus } = useSession();
  const hospitalId = session?.user?.hospitalId;
  const usuario = session?.user;
  const usuarioEmail = usuario?.email;
  const naoLidas = useChatNaoLidas();

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [ativo, setAtivo] = useState<Destino | null>(null);
  const [busca, setBusca] = useState('');
  const [texto, setTexto] = useState('');
  const [erroContatos, setErroContatos] = useState('');
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [erroMensagens, setErroMensagens] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const ultimoDestino = useRef<string | null>(null);
  const chaveAtiva = chaveDoDestino(ativo);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
    setContatos([]);
    setAtivo(null);
    setErroContatos('');
    if (!hospitalId || !usuarioEmail) {
      setCarregandoContatos(false);
      return () => { active = false; };
    }
    setCarregandoContatos(true);
    const lerJson = async (r: Response) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Não foi possível carregar o chat.');
      return data;
    };
    Promise.all([
      fetch('/api/chat/contatos').then(lerJson),
      fetch('/api/chat/canais').then(lerJson).catch(() => []),
    ])
      .then(([pessoas, listaCanais]) => {
        if (!active) return;
        const filtrados: { id: string; nome?: string; email: string; cargo?: string }[] = Array.isArray(pessoas) ? pessoas.filter(u => u.email !== usuarioEmail) : [];
        setContatos(filtrados.map((u, i) => ({
          id: u.id,
          nome: u.nome || u.email,
          email: u.email,
          cargo: u.cargo || 'Profissional',
          cor: CORES[i % CORES.length]
        })));
        setCanais(Array.isArray(listaCanais) ? listaCanais : []);
      })
      .catch(error => {
        if (active) setErroContatos(error instanceof Error ? error.message : 'Erro ao carregar profissionais.');
      })
      .finally(() => { if (active) setCarregandoContatos(false); });
    return () => { active = false; };
  }, [hospitalId, usuarioEmail, sessionStatus]);

  const carregar = useCallback(async (destino: Destino, opcoes: { mostrar?: boolean; abrir?: boolean; ativo: () => boolean }) => {
    if (opcoes.mostrar) setCarregandoMensagens(true);
    try {
      const response = await fetch(`/api/chat?${consultaDoDestino(destino)}${opcoes.abrir ? '&abrir=1' : ''}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a conversa.');
      if (opcoes.ativo()) {
        setMensagens(Array.isArray(data) ? data : []);
        setErroMensagens('');
        // Ler zera o contador: avisa o selo do menu e do cabeçalho.
        window.dispatchEvent(new Event(EVENTO_CHAT));
      }
    } catch (error) {
      if (opcoes.ativo()) setErroMensagens(error instanceof Error ? error.message : 'Erro ao carregar a conversa.');
    } finally {
      if (opcoes.ativo() && opcoes.mostrar) setCarregandoMensagens(false);
    }
  }, []);

  useEffect(() => {
    if (!hospitalId || !ativo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setMensagens([]);
      return;
    }
    let active = true;
    const vivo = () => active;
    setMensagens([]);
    carregar(ativo, { mostrar: true, abrir: true, ativo: vivo });
    // A cada 4 s, só com a aba visível (economiza banco e bateria).
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') carregar(ativo, { ativo: vivo });
    }, 4000);
    return () => { active = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só ao trocar de conversa
  }, [hospitalId, chaveAtiva, carregar]);

  useEffect(() => {
    // Scroll apenas dentro do container de mensagens — não a página toda
    const caixa = msgContainerRef.current;
    if (!caixa) return;
    // Só rola se a pessoa trocou de conversa ou já estava lendo o fim; não puxa de volta quem lê mensagens antigas.
    const trocou = ultimoDestino.current !== chaveAtiva;
    const noFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 80;
    if (trocou || noFim) caixa.scrollTop = caixa.scrollHeight;
    ultimoDestino.current = chaveAtiva;
  }, [mensagens, chaveAtiva]);

  const conversa = [...mensagens].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || !ativo || !usuario || !hospitalId || enviando) return;
    setEnviando(true);
    setErroMensagens('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ativo.tipo === 'pessoa' ? { para: ativo.contato.email, texto: conteudo } : { canal: ativo.canal.slug, texto: conteudo })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      setMensagens(prev => [...prev, data]);
      setTexto('');
    } catch (error) {
      setErroMensagens(error instanceof Error ? error.message : 'Falha ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const termo = busca.toLowerCase();
  const contatosFiltrados = contatos.filter(c => c.nome.toLowerCase().includes(termo));
  const canaisFiltrados = canais.filter(c => c.nome.toLowerCase().includes(termo));
  const nomeAtivo = ativo ? (ativo.tipo === 'pessoa' ? ativo.contato.nome : ativo.canal.nome) : '';

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-comments" title="Chat interno" subtitle="Conversas e canais por setor entre os profissionais deste hospital." />

      <div className="chat-root" data-ativo={ativo ? 'true' : 'false'}>

        <aside className="chat-sidebar" aria-label="Conversas">
          <div className="chat-perfil">
            <div className="chat-avatar chat-avatar-eu" aria-hidden="true">
              {usuario?.name ? getInitials(usuario.name) : usuario?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="chat-perfil-texto">
              <strong>{usuario?.name || 'Usuário'}</strong>
              <span>{CARGO_LABEL[usuario?.cargo as Cargo] || 'Online'}</span>
            </div>
          </div>

          <div className="chat-busca">
            <SearchInput value={busca} onChange={setBusca} placeholder="Pesquisar" label="Pesquisar conversas e profissionais" />
          </div>

          <div className="chat-contatos">
            {sessionStatus === 'loading' || carregandoContatos ? (
              <p role="status" className="chat-aviso">Carregando...</p>
            ) : erroContatos ? (
              <p role="alert" className="chat-aviso chat-aviso-erro">{erroContatos}</p>
            ) : (
              <>
                {canaisFiltrados.length > 0 && <h2 className="chat-secao">Canais</h2>}
                {canaisFiltrados.map(c => {
                  const n = naoLidas.porCanal[c.slug] ?? 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="chat-contact"
                      onClick={() => setAtivo({ tipo: 'canal', canal: c })}
                      aria-pressed={chaveAtiva === `c:${c.slug}`}
                    >
                      <span className="chat-avatar chat-avatar-canal" aria-hidden="true"><Hash size={18} /></span>
                      <span className="chat-contact-texto">
                        <strong>{c.nome}</strong>
                        <span>{c.descricao || 'Canal do setor'}</span>
                      </span>
                      {n > 0 && <span className="chat-badge" aria-label={`${n} não lidas`}>{n > 99 ? '99+' : n}</span>}
                    </button>
                  );
                })}

                <h2 className="chat-secao">Profissionais</h2>
                {contatosFiltrados.length === 0 ? (
                  <p className="chat-aviso">Nenhum outro profissional ativo disponível.</p>
                ) : contatosFiltrados.map(c => {
                  const n = naoLidas.porContato[c.email] ?? 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="chat-contact"
                      onClick={() => setAtivo({ tipo: 'pessoa', contato: c })}
                      aria-pressed={chaveAtiva === `p:${c.email}`}
                    >
                      <span className="chat-avatar" style={{ '--c': c.cor } as React.CSSProperties} aria-hidden="true">{getInitials(c.nome)}</span>
                      <span className="chat-contact-texto">
                        <strong>{c.nome}</strong>
                        <span>{CARGO_LABEL[c.cargo as Cargo] || c.cargo}</span>
                      </span>
                      {n > 0 && <span className="chat-badge" aria-label={`${n} não lidas`}>{n > 99 ? '99+' : n}</span>}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        <section className="chat-main" aria-label="Conversa">
          {!ativo ? (
            <EmptyState icon="las la-comments" message="Selecione um canal ou profissional para conversar." />
          ) : (
            <>
              <div className="chat-topo">
                <button type="button" className="btn btn-secondary btn-sm ux-icon-btn chat-voltar" onClick={() => setAtivo(null)} aria-label="Voltar para a lista de conversas">
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                {ativo.tipo === 'pessoa' ? (
                  <span className="chat-avatar" style={{ '--c': ativo.contato.cor } as React.CSSProperties} aria-hidden="true">{getInitials(ativo.contato.nome)}</span>
                ) : (
                  <span className="chat-avatar chat-avatar-canal" aria-hidden="true"><Hash size={18} /></span>
                )}
                <div className="chat-contact-texto">
                  <h2>{nomeAtivo}</h2>
                  <span>{ativo.tipo === 'pessoa' ? (CARGO_LABEL[ativo.contato.cargo as Cargo] || ativo.contato.cargo) : (ativo.canal.descricao || 'Canal aberto a toda a equipe do hospital')}</span>
                </div>
              </div>

              <div ref={msgContainerRef} className="chat-mensagens" role="log" aria-live="polite" aria-label={`Conversa com ${nomeAtivo}`}>
                {erroMensagens && <p role="alert" className="mod-aviso mod-aviso-erro">{erroMensagens}</p>}
                {carregandoMensagens ? (
                  <p role="status" className="chat-aviso">Carregando conversa...</p>
                ) : conversa.length === 0 ? (
                  <p className="chat-aviso">Nenhuma mensagem ainda. Envie a primeira.</p>
                ) : conversa.map(m => {
                  const isSent = m.de === usuario?.email;
                  return (
                    <div key={m.id} className={`chat-linha ${isSent ? 'enviada' : 'recebida'}`}>
                      <div className="chat-balao">
                        {ativo.tipo === 'canal' && !isSent && m.nome && <div className="chat-autor">{m.nome}</div>}
                        <div className="chat-texto">{m.texto}</div>
                        <div className="chat-hora">{formatHora(m.data)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={enviar} className="chat-form">
                <input
                  type="text"
                  aria-label="Mensagem"
                  placeholder="Digite sua mensagem"
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  maxLength={4000}
                />
                <button
                  type="submit"
                  className="btn btn-primary ux-icon-btn chat-enviar"
                  aria-label="Enviar mensagem"
                  disabled={!texto.trim() || enviando || carregandoMensagens}
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              </form>
              <p className="chat-aviso-clinico">
                Não use o chat para ordens médicas nem para dados completos de paciente: use o prontuário. As mensagens ficam registradas no hospital.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
