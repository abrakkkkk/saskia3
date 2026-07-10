'use client';

import { useState, useEffect, useRef } from 'react';

interface Mensagem {
  id: string;
  remetente: string;
  texto: string;
  dataHora: string;
}

export default function ChatPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novoTexto, setNovoTexto] = useState('');
  const mensagensFimRef = useRef<HTMLDivElement>(null);

  const fetchMensagens = () => {
    fetch('/api/chat')
      .then(res => res.json())
      .then(data => setMensagens(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchMensagens();
    // Simples polling a cada 5 segundos para simular tempo real
    const intervalo = setInterval(fetchMensagens, 5000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    // Scrollar pro final sempre que chegar mensagem nova
    mensagensFimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTexto.trim()) return;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: novoTexto })
      });
      if (res.ok) {
        setNovoTexto('');
        fetchMensagens();
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-comments"></i> Chat Institucional (Global)</h2>
          <p>Comunicação instantânea com toda a equipe conectada</p>
        </div>
      </div>

      <div style={{ display: 'flex', height: '65vh', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        
        {/* Contatos (Fixo no Global) */}
        <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', maxWidth: '300px' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#eff6ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <i className="las la-globe"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#1e3a8a' }}>Geral (Saskia)</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Todos os usuários</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
          
          {/* Topbar Chat */}
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <i className="las la-globe"></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>Sala Global do Hospital</div>
              <div style={{ fontSize: '12px', color: '#10b981' }}>Mensagens criptografadas de ponta a ponta</div>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div style={{ flex: 1, background: '#f1f5f9', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {mensagens.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px' }}>Nenhuma mensagem na sala global.</div>
            ) : (
              mensagens.map(msg => (
                <div key={msg.id} style={{ alignSelf: 'flex-start', background: 'white', padding: '12px 15px', borderRadius: '15px 15px 15px 0', maxWidth: '80%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, marginBottom: '5px' }}>{msg.remetente}</div>
                  <div style={{ color: '#334155', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.texto}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', marginTop: '5px' }}>
                    {new Date(msg.dataHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))
            )}
            <div ref={mensagensFimRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={enviarMensagem} style={{ padding: '15px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Digite sua mensagem para todos do hospital..." 
              style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
            />
            <button type="submit" disabled={!novoTexto.trim()} style={{ width: '40px', height: '40px', borderRadius: '50%', background: novoTexto.trim() ? '#3b82f6' : '#cbd5e1', border: 'none', color: 'white', fontSize: '20px', cursor: novoTexto.trim() ? 'pointer' : 'default', transition: 'background 0.2s' }}>
              <i className="las la-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
