'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Contato {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  cor: string;
}

interface Mensagem {
  id: number;
  de: string;
  para: string;
  texto: string;
  data: string;
  lida: boolean;
}

const CORES = ['#3b82f6','#10b981','#8b5cf6','#f97316','#ec4899','#14b8a6'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { data: session } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [ativo, setAtivo] = useState<Contato | null>(null);
  const [busca, setBusca] = useState('');
  const [texto, setTexto] = useState('');
  const msgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hospitalId || !usuario) return;
    fetch('/api/usuarios')
      .then(r => r.json())
      .then(data => {
        let lista: any[] = Array.isArray(data) ? data : [];
        if (lista.length === 0) {
          lista = [
            { id: 'u1', nome: 'Dr. Carlos Silva', email: 'carlos@saskia.com', cargo: 'Médico', setor: 'Cardiologia', hospitalId },
            { id: 'u2', nome: 'Enf. Joana', email: 'joana@saskia.com', cargo: 'Enfermeira', setor: 'UTI', hospitalId },
            { id: 'u3', nome: 'Ana Recepção', email: 'ana@saskia.com', cargo: 'Recepcionista', setor: 'Recepção', hospitalId },
          ];
        }
        const filtrados = lista.filter(u => u.hospitalId === hospitalId && u.email !== usuario.email);
        setContatos(filtrados.map((u, i) => ({
          id: u.id || `u${i}`,
          nome: u.nome || u.name || u.email,
          email: u.email,
          cargo: u.cargo || 'Profissional',
          setor: u.setor || 'Hospital',
          cor: CORES[i % CORES.length]
        })));
      })
      .catch(console.error);
  }, [hospitalId, usuario]);

  useEffect(() => {
    if (!hospitalId) return;
    const load = () => {
      fetch('/api/chat')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setMensagens(data); })
        .catch(console.error);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [hospitalId]);

  useEffect(() => {
    // Scroll apenas dentro do container de mensagens — não a página toda
    if (msgContainerRef.current) {
      msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight;
    }
  }, [mensagens, ativo]);

  const conversa = mensagens
    .filter(m => ativo && ((m.de === usuario?.email && m.para === ativo.email) || (m.de === ativo.email && m.para === usuario?.email)))
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || !ativo || !usuario || !hospitalId) return;
    const nova: Mensagem = { id: Date.now(), de: usuario.email, para: ativo.email, texto, data: new Date().toISOString(), lida: false };
    setMensagens(prev => [...prev, nova]);
    setTexto('');
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ de: usuario.email, para: ativo.email, texto, data: nova.data })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const contatosFiltrados = contatos.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const naoLidas = (contato: Contato) =>
    mensagens.filter(m => m.de === contato.email && m.para === usuario?.email && !m.lida).length;

  const ultimaMsg = (contato: Contato) =>
    mensagens
      .filter(m => (m.de === usuario?.email && m.para === contato.email) || (m.de === contato.email && m.para === usuario?.email))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

  return (
    <div style={{
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
      <div style={{ width: '320px', minWidth: '320px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>

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
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>🔍</span>
            <input
              type="text"
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
          {contatosFiltrados.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Nenhum contato.</div>
          ) : contatosFiltrados.map(c => {
            const isAtivo = ativo?.id === c.id;
            const ultima = ultimaMsg(c);
            const nL = naoLidas(c);
            return (
              <div
                key={c.id}
                onClick={() => setAtivo(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer',
                  background: isAtivo ? '#eff6ff' : 'transparent',
                  borderLeft: `3px solid ${isAtivo ? '#1e3a8a' : 'transparent'}`,
                  transition: 'all 0.15s'
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
                  <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                    <span>📍</span> {c.setor}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  {ultima && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatHora(ultima.data)}</span>}
                  {nL > 0 && (
                    <span style={{ background: '#16a34a', color: 'white', borderRadius: '8px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>{nL}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f2f5', overflow: 'hidden' }}>
        {!ativo ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
            <span style={{ fontSize: '64px', opacity: 0.3 }}>💬</span>
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
                <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  {ativo.setor}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                {['🔍','📞','📹','⋮'].map((icon, i) => (
                  <button key={i} style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                    background: 'transparent', cursor: 'pointer', fontSize: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >{icon}</button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div ref={msgContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conversa.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '32px', opacity: 0.4, marginBottom: '8px' }}>💬</div>
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
              {['😊','📎'].map((icon, i) => (
                <button key={i} type="button" style={{
                  width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: '#64748b'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >{icon}</button>
              ))}
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#334155' }}
                />
              </div>
              <button
                type="submit"
                disabled={!texto.trim()}
                style={{
                  width: '42px', height: '42px', borderRadius: '50%', border: 'none',
                  background: texto.trim() ? '#1e3a8a' : '#cbd5e1',
                  color: 'white', fontSize: '18px', cursor: texto.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
