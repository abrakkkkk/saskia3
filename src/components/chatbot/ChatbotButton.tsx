'use client';

import { useState } from 'react';
import ChatbotWindow from './ChatbotWindow';
import Image from 'next/image';

export default function ChatbotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={() => setOpen(!open)}
        title="EnfBia Bot — Assistente IA"
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
        aria-expanded={open}
      >
        <Image
          src="/images/enfbiabot.png"
          alt="EnfBia Bot"
          width={34}
          height={34}
          className="chatbot-fab-img"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </button>
      {open && <ChatbotWindow onClose={() => setOpen(false)} />}
    </>
  );
}
