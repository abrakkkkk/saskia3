'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Send } from 'lucide-react';
import { PageHeader, SearchInput, EmptyState } from '@/components/ui';
import { CARGO_LABEL, type Cargo } from '@/lib/permissions';
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

interface Mensagem {
  id: string;
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

export default function ChatPage() {
  const { data: session, status: sessionStatus } = useSession();
  const hospitalId = session?.user?.hospitalId;
  const usuario = session?.user;
  const usuarioEmail = usuario?.email;

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [ativo, setAtivo] = useState<Contato | null>(null);
  const [busca, setBusca] = useState('');
  const [texto, setTexto] = useState('');
  const [erroContatos, setErroContatos] = useState('');
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [erroMensagens, setErroMensagens] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const ultimoContato = useRef<string | null>(null);

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
    fetch('/api/chat/contatos')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Não foi possível carregar os profissionais.');
        return data;
      })
      .then(data => {
        if (!active) return;
        const filtrados: { id: string; nome?: string; email: string; cargo?: string }[] = Array.isArray(data) ? data.filter(u => u.email !== usuarioEmail) : [];
        setContatos(filtrados.map((u, i) => ({
          id: u.id,
          nome: u.nome || u.email,
          email: u.email,
          cargo: u.cargo || 'Profissional',
          cor: CORES[i % CORES.length]
        })));
      })
      .catch(error => {
        if (active) setErroContatos(error instanceof Error ? error.message : 'Erro ao carregar profissionais.');
      })
      .finally(() => { if (active) setCarregandoContatos(false); });
    return () => { active = false; };
  }, [hospitalId, usuarioEmail, sessionStatus]);

  useEffect(() => {
    if (!hospitalId || !ativo?.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setMensagens([]);
      return;
    }
    let active = true;
    const load = async (showLoading = false) => {
      if (showLoading) setCarregandoMensagens(true);
      try {
        const response = await fetch(`/api/chat?para=${encodeURIComponent(ativo.email)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a conversa.');
        if (active) {
          setMensagens(Array.isArray(data) ? data : []);
          setErroMensagens('');
        }
      } catch (error) {
        if (active) setErroMensagens(error instanceof Error ? error.message : 'Erro ao carregar a conversa.');
      } finally {
        if (active && showLoading) setCarregandoMensagens(false);
      }
    };
    setMensagens([]);
    load(true);
    const iv = setInterval(() => load(), 10000);
    return () => { active = false; clearInterval(iv); };
  }, [hospitalId, ativo?.email]);

  useEffect(() => {
    // Scroll apenas dentro do container de mensagens — não a página toda
    const caixa = msgContainerRef.current;
    if (!caixa) return;
    // Só rola se a pessoa trocou de conversa ou já estava lendo o fim; não puxa de volta quem lê mensagens antigas.
    const trocou = ultimoContato.current !== (ativo?.email ?? null);
    const noFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 80;
    if (trocou || noFim) caixa.scrollTop = caixa.scrollHeight;
    ultimoContato.current = ativo?.email ?? null;
  }, [mensagens, ativo]);

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
        body: JSON.stringify({ para: ativo.email, texto: conteudo })
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

  const contatosFiltrados = contatos.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-comments" title="Chat interno" subtitle="Conversas entre profissionais deste hospital." />

      <div className="chat-root" data-ativo={ativo ? 'true' : 'false'}>

        <aside className="chat-sidebar" aria-label="Profissionais">
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
            <SearchInput value={busca} onChange={setBusca} placeholder="Pesquisar profissionais" label="Pesquisar profissionais" />
          </div>

          <div className="chat-contatos">
            {sessionStatus === 'loading' || carregandoContatos ? (
              <p role="status" className="chat-aviso">Carregando profissionais...</p>
            ) : erroContatos ? (
              <p role="alert" className="chat-aviso chat-aviso-erro">{erroContatos}</p>
            ) : contatosFiltrados.length === 0 ? (
              <p className="chat-aviso">Nenhum outro profissional ativo disponível.</p>
            ) : contatosFiltrados.map(c => (
              <button
                key={c.id}
                type="button"
                className="chat-contact"
                onClick={() => setAtivo(c)}
                aria-pressed={ativo?.id === c.id}
              >
                <span className="chat-avatar" style={{ '--c': c.cor } as React.CSSProperties} aria-hidden="true">{getInitials(c.nome)}</span>
                <span className="chat-contact-texto">
                  <strong>{c.nome}</strong>
                  <span>{CARGO_LABEL[c.cargo as Cargo] || c.cargo}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chat-main" aria-label="Conversa">
          {!ativo ? (
            <EmptyState icon="las la-comments" message="Selecione um profissional para iniciar a conversa." />
          ) : (
            <>
              <div className="chat-topo">
                <button type="button" className="btn btn-secondary btn-sm ux-icon-btn chat-voltar" onClick={() => setAtivo(null)} aria-label="Voltar para a lista de profissionais">
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <span className="chat-avatar" style={{ '--c': ativo.cor } as React.CSSProperties} aria-hidden="true">{getInitials(ativo.nome)}</span>
                <div className="chat-contact-texto">
                  <h2>{ativo.nome}</h2>
                  <span>{CARGO_LABEL[ativo.cargo as Cargo] || ativo.cargo}</span>
                </div>
              </div>

              <div ref={msgContainerRef} className="chat-mensagens" role="log" aria-live="polite" aria-label={`Conversa com ${ativo.nome}`}>
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}
