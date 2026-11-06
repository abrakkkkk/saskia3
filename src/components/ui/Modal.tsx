'use client';

import { useEffect, useId, useRef, type KeyboardEvent as TeclaReact, type ReactNode } from 'react';
import './modal.css';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * Janela de diálogo padrão do sistema: foco preso, Esc fecha, rolagem da página travada e foco
 * devolvido ao fechar. `busy` bloqueia o fechamento durante um envio. Clicar fora só fecha com
 * `closeOnBackdrop` (por padrão não, para não perder o que foi digitado). Estilos em modal.css.
 */
export function Modal({ title, icon, onClose, busy = false, size = 'md', closeLabel = 'Fechar', closeOnBackdrop = false, children }: {
  title: ReactNode;
  icon?: string;
  onClose: () => void;
  busy?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialogo = dialogRef.current;
    const primeiroCampo = dialogo?.querySelector<HTMLElement>('.ui-modal-body input:not([type="checkbox"]):not([disabled]), .ui-modal-body select:not([disabled]), .ui-modal-body textarea:not([disabled])');
    (primeiroCampo ?? dialogo)?.focus();
    return () => {
      document.body.style.overflow = overflowAnterior;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);

  const aoTeclar = (event: TeclaReact<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!busyRef.current) onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focaveis = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
    if (focaveis.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (event.shiftKey && (document.activeElement === primeiro || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={event => { if (closeOnBackdrop && !busy && event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className={`ui-modal ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={aoTeclar}
      >
        <div className="ui-modal-head">
          <h2 id={titleId}>{icon && <i className={icon} aria-hidden="true"></i>} {title}</h2>
          <button type="button" className="btn btn-secondary btn-sm ui-modal-close" aria-label={closeLabel} title={closeLabel} onClick={onClose} disabled={busy}>
            <i className="las la-times" aria-hidden="true"></i>
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Rodapé de ações do diálogo (botões à direita; em celular ocupam a largura). */
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="ui-modal-foot">{children}</div>;
}
