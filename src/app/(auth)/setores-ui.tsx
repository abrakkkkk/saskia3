'use client';

import { useEffect, useId, type ReactNode } from 'react';

export async function mensagemDeErro(res: Response, padrao: string) {
  const corpo: unknown = await res.json().catch(() => null);
  return corpo && typeof corpo === 'object' && 'error' in corpo && typeof corpo.error === 'string' ? corpo.error : padrao;
}

export function dataLocalISO(data = new Date()) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Link do catálogo do Drive só abre em host do Google, por https. */
export function urlGoogleSegura(link: unknown): string | null {
  if (typeof link !== 'string') return null;
  try {
    const url = new URL(link);
    const host = url.hostname;
    const permitido = host === 'drive.google.com' || host === 'docs.google.com' || host.endsWith('.googleusercontent.com');
    return url.protocol === 'https:' && permitido ? url.href : null;
  } catch {
    return null;
  }
}

export function Modal({ titulo, aoFechar, largo, classe, children }: {
  titulo: string;
  aoFechar: () => void;
  largo?: boolean;
  classe?: string;
  children: ReactNode;
}) {
  const tituloId = useId();

  useEffect(() => {
    const fecharComEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [aoFechar]);

  return (
    <div className="sc-modal" onMouseDown={evento => { if (evento.target === evento.currentTarget) aoFechar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={tituloId} className={`sc-modal-caixa ${largo ? 'sc-modal-largo' : ''} ${classe ?? ''}`}>
        <div className="sc-modal-topo">
          <h2 id={tituloId}>{titulo}</h2>
          <button type="button" className="sc-modal-fechar sc-nao-imprimir" aria-label="Fechar" onClick={aoFechar}>
            <i className="las la-times" aria-hidden="true"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
