'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './chat-badge.css';

export type ResumoChat = { total: number; porContato: Record<string, number>; porCanal: Record<string, number> };
const VAZIO: ResumoChat = { total: 0, porContato: {}, porCanal: {} };
export const EVENTO_CHAT = 'chat:atualizar';

/** Não lidas do chat: consulta leve que pausa com a aba escondida (20 s fora do chat, 5 s dentro dele). */
export function useChatNaoLidas(): ResumoChat {
  const pathname = usePathname();
  const [resumo, setResumo] = useState<ResumoChat>(VAZIO);
  const noChat = pathname.startsWith('/chat');

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const r = await fetch('/api/chat/resumo', { cache: 'no-store' });
        if (!r.ok) return;
        const dados = await r.json();
        if (ativo) setResumo({ total: dados.total ?? 0, porContato: dados.porContato ?? {}, porCanal: dados.porCanal ?? {} });
      } catch { /* sem rede: tenta de novo no próximo ciclo */ }
    };
    buscar();
    const iv = setInterval(buscar, noChat ? 5000 : 20000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') buscar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener(EVENTO_CHAT, buscar);
    return () => {
      ativo = false;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener(EVENTO_CHAT, buscar);
    };
  }, [noChat]);

  return resumo;
}

/** Bolinha com a contagem. Some quando não há nada novo. */
export function ChatBadge({ className = '' }: { className?: string }) {
  const { total } = useChatNaoLidas();
  if (total <= 0) return null;
  return (
    <span className={`chat-badge ${className}`} role="status" aria-label={`${total} mensagens não lidas`}>
      {total > 99 ? '99+' : total}
    </span>
  );
}
