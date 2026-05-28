'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGESTOES = [
  'Triagem Manchester', 'Sinais vitais normais', 'Protocolo de queda',
  'Medicamentos', 'Primeiros socorros', 'Documentação',
];

export default function ChatbotWindow({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      const nome = session?.user?.name?.split(' ')[0] || 'profissional';
      setMessages([{
        role: 'assistant',
        content: `Olá, ${nome}! 👋 Sou o **EnfBia Bot**, seu assistente de IA do Saskia Saúde.\n\nEstou aqui para ajudar com protocolos clínicos, dúvidas sobre medicamentos, triagem, cuidados de enfermagem e muito mais.\n\nComo posso ajudar você hoje?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const enviarMensagem = async (texto?: string) => {
    const msg = texto || input.trim();
    if (!msg || loading) return;
    setInput('');
    setShowSugestoes(false);

    const userMsg: Message = {
      role: 'user', content: msg,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const historicoParaEnviar = [...messages.slice(-12), userMsg].map(m => ({
        role: m.role, content: m.content,
      }));

      const response = await fetch('/api/chat-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historicoParaEnviar }),
      });

      const data = await response.json();
      const botContent = data.content?.[0]?.text || data.error?.message || 'Erro ao processar resposta.';

      setMessages(prev => [...prev, {
        role: 'assistant', content: botContent,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Não foi possível conectar ao assistente. Tente novamente em instantes.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="chatbot-window">
      <div className="chatbot-header">
        <Image src="/images/enfbiabot.png" alt="EnfBia Bot" width={40} height={40} className="chatbot-header-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="chatbot-header-info">
          <h4>EnfBia Bot</h4>
          <span>Assistente IA — Online</span>
        </div>
        <button className="chatbot-close" onClick={onClose}>
          <i className="las la-times"></i>
        </button>
      </div>

      <div className="chatbot-messages" ref={messagesRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chatbot-msg ${msg.role}`}>
            {msg.role === 'assistant' && (
              <Image src="/images/enfbiabot.png" alt="Bot" width={32} height={32} className="chatbot-msg-avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div>
              <div className="chatbot-msg-bubble" dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br />')
              }} />
              <div className="chatbot-msg-time">{msg.timestamp}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chatbot-msg assistant">
            <div className="chatbot-msg-bubble">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSugestoes && (
        <div className="chatbot-sugestoes">
          {SUGESTOES.map((s, i) => (
            <button key={i} className="sugestao-btn" onClick={() => enviarMensagem(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chatbot-input-area">
        <textarea
          ref={inputRef}
          className="chatbot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder="Pergunte sobre protocolos, medicamentos, cuidados..."
          rows={1}
        />
        <button className="chatbot-send" onClick={() => enviarMensagem()} disabled={loading}>
          <i className="las la-paper-plane"></i>
        </button>
      </div>
    </div>
  );
}
