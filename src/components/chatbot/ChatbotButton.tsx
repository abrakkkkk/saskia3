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
      >
        <Image
          src="/images/enfbiabot.png"
          alt="EnfBia Bot"
          width={34}
          height={34}
          className="chatbot-fab-img"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {!open && <span className="chatbot-notif">1</span>}
      </button>
      {open && <ChatbotWindow onClose={() => setOpen(false)} />}
    </>
  );
}
