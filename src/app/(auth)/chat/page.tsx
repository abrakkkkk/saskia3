'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, Search, Send } from 'lucide-react';
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
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;
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

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    let active = true;
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
        const filtrados: any[] = Array.isArray(data) ? data.filter(u => u.email !== usuarioEmail) : [];
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
    if (msgContainerRef.current) {
      msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight;
    }
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
    <div className="chat-root" style={{
      display: 'flex',
      height: 'calc(100vh - 80px - 60px)',
      maxHeight: '820px',
      background: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      border: '1px solid #e2e8f0',
      marginTop: '-10px'
    }}>

      {/* SIDEBAR */}
      <div className="chat-sidebar" style={{ width: '320px', minWidth: '320px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>

        {/* Header User */}
        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 700, color: 'white', flexShrink: 0
          }}>
            {usuario?.name ? getInitials(usuario.name) : usuario?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {usuario?.name || 'Usuário'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>{(usuario as any)?.cargo || 'Online'}</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '8px 14px', gap: '8px' }}>
            <Search size={16} aria-hidden="true" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              aria-label="Pesquisar profissionais"
              placeholder="Pesquisar contatos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#475569' }}
            />
          </div>
        </div>

        {/* Label */}
        <div style={{ padding: '10px 16px 6px', fontSize: '10px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Conversas
        </div>

        {/* Contatos */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessionStatus === 'loading' || carregandoContatos ? (
            <div role="status" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Carregando profissionais...</div>
          ) : erroContatos ? (
            <div role="alert" style={{ padding: '20px', color: '#b91c1c', fontSize: '13px' }}>{erroContatos}</div>
          ) : contatosFiltrados.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Nenhum outro profissional ativo disponível.</div>
          ) : contatosFiltrados.map(c => {
            const isAtivo = ativo?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className="chat-contact"
                onClick={() => setAtivo(c)}
                aria-pressed={isAtivo}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer',
                  background: isAtivo ? '#eff6ff' : 'transparent',
                  borderLeft: `3px solid ${isAtivo ? '#1e3a8a' : 'transparent'}`,
                  transition: 'all 0.15s',
                  width: '100%', borderTop: 0, borderRight: 0, borderBottom: 0,
                  textAlign: 'left', font: 'inherit'
                }}
                onMouseEnter={e => { if (!isAtivo) (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
                onMouseLeave={e => { if (!isAtivo) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                  background: c.cor + '20', color: c.cor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '14px'
                }}>
                  {getInitials(c.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{c.cargo}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f2f5', overflow: 'hidden' }}>
        {!ativo ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
            <MessageSquare size={48} aria-hidden="true" style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#64748b' }}>Chat Interno — Saskia Saúde</div>
            <div style={{ fontSize: '14px' }}>Selecione um profissional para iniciar</div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: ativo.cor + '20', color: ativo.cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '14px'
              }}>
                {getInitials(ativo.nome)}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{ativo.nome}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{ativo.cargo}</div>
              </div>
            </div>

            {/* Messages */}
            <div ref={msgContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {erroMensagens && <div role="alert" style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 12px', borderRadius: 8 }}>{erroMensagens}</div>}
              {carregandoMensagens ? (
                <div role="status" style={{ margin: 'auto', color: '#64748b' }}>Carregando conversa...</div>
              ) : conversa.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                  <MessageSquare size={28} aria-hidden="true" style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <div style={{ fontSize: '14px' }}>Nenhuma mensagem ainda. Envie a primeira!</div>
                </div>
              ) : conversa.map(m => {
                const isSent = m.de === usuario?.email;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: isSent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isSent ? '#1e3a8a' : 'white',
                      color: isSent ? 'white' : '#1e293b',
                      fontSize: '14px', lineHeight: '1.5',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                      <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: isSent ? 'right' : 'left' }}>
                        {formatHora(m.data)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form onSubmit={enviar} style={{
              padding: '14px 16px', background: 'white', borderTop: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0
            }}>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
                <input
                  type="text"
                  aria-label="Mensagem"
                  placeholder="Digite sua mensagem..."
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  maxLength={4000}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#334155' }}
                />
              </div>
              <button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={!texto.trim() || enviando || carregandoMensagens}
                style={{
                  width: '42px', height: '42px', borderRadius: '50%', border: 'none',
                  background: texto.trim() && !enviando ? '#1e3a8a' : '#cbd5e1',
                  color: 'white', fontSize: '18px', cursor: texto.trim() && !enviando ? 'pointer' : 'default',
                  transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}
                >
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
