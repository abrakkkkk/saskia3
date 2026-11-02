'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './alert-provider.css';

type TipoToast = 'sucesso' | 'erro' | 'aviso' | 'info';
type Toast = { id: number; tipo: TipoToast; texto: string };
type Confirmacao = { texto: string; resolver: (valor: boolean) => void };

const ROTULO: Record<TipoToast, string> = { sucesso: 'Sucesso', erro: 'Erro', aviso: 'Atenção', info: 'Informação' };
const ICONE: Record<TipoToast, string> = {
  sucesso: 'las la-check-circle',
  erro: 'las la-times-circle',
  aviso: 'las la-exclamation-triangle',
  info: 'las la-info-circle',
};

// As chamadas existentes de alert() só trazem texto: o tipo é inferido do conteúdo, de forma conservadora.
// Mensagem de recusa do servidor ("insuficiente", "não foi possível"...) é tratada como erro.
function classificar(texto: string): TipoToast {
  const t = texto.toLocaleLowerCase('pt-BR');
  if (/(erro|falha|n[aã]o foi poss|n[aã]o foi|inv[aá]lid|insuficiente|negad|sem permiss|n[aã]o autorizado|incorret|j[aá] existe|indispon)/.test(t)) return 'erro';
  if (/(preencha|aten[cç][aã]o|digite|selecione|informe|descreva|obrigat|confira)/.test(t)) return 'aviso';
  if (/(sucesso|salv|confirmad|enviad|registrad|criad|cadastrad|conclu[ií]d|atualizad|liberad|cancelad)/.test(t)) return 'sucesso';
  return 'info';
}

/**
 * Substitui window.alert por toasts acessíveis (região aria-live) e window.confirm por um diálogo modal.
 * `await confirm(...)` continua funcionando; chamadas sem await seguem sempre verdadeiras (Promise),
 * por isso todas as chamadas do sistema precisam de await.
 */
export default function AlertProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const proximoId = useRef(1);
  const origemFoco = useRef<HTMLElement | null>(null);
  const botaoCancelar = useRef<HTMLButtonElement>(null);
  const dialogo = useRef<HTMLDivElement>(null);

  const remover = useCallback((id: number) => setToasts(atual => atual.filter(t => t.id !== id)), []);

  useEffect(() => {
    const alertOriginal = window.alert;
    const confirmOriginal = window.confirm;

    window.alert = (mensagem?: unknown) => {
      const texto = String(mensagem ?? '').trim();
      if (!texto) return;
      const id = proximoId.current++;
      const tipo = classificar(texto);
      setToasts(atual => [...atual.slice(-3), { id, tipo, texto }]);
      // Erros ficam mais tempo na tela.
      window.setTimeout(() => remover(id), tipo === 'erro' ? 9000 : 5000);
    };

    // O contrato de confirm() é boolean síncrono; aqui devolve Promise<boolean>, exigindo await.
    window.confirm = ((mensagem?: string) => new Promise<boolean>(resolver => {
      origemFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConfirmacao({ texto: String(mensagem ?? ''), resolver });
    })) as unknown as typeof window.confirm;

    return () => {
      window.alert = alertOriginal;
      window.confirm = confirmOriginal;
    };
  }, [remover]);

  const responder = useCallback((valor: boolean) => {
    setConfirmacao(atual => {
      atual?.resolver(valor);
      return null;
    });
    origemFoco.current?.focus();
  }, []);

  useEffect(() => {
    if (!confirmacao) return;
    botaoCancelar.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        responder(false);
        return;
      }
      if (evento.key !== 'Tab' || !dialogo.current) return;
      const focaveis = dialogo.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [confirmacao, responder]);

  return (
    <>
      <div className="alp-toasts" role="region" aria-label="Avisos do sistema" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`alp-toast alp-${toast.tipo}`} role={toast.tipo === 'erro' ? 'alert' : 'status'}>
            <i className={ICONE[toast.tipo]} aria-hidden="true"></i>
            <p><strong>{ROTULO[toast.tipo]}.</strong> {toast.texto}</p>
            <button type="button" aria-label="Fechar aviso" onClick={() => remover(toast.id)}>&times;</button>
          </div>
        ))}
      </div>

      {confirmacao && (
        <div className="alp-overlay" onMouseDown={evento => { if (evento.target === evento.currentTarget) responder(false); }}>
          <div ref={dialogo} className="alp-dialogo" role="alertdialog" aria-modal="true" aria-labelledby="alp-titulo" aria-describedby="alp-texto">
            <h2 id="alp-titulo">Confirmação</h2>
            <p id="alp-texto">{confirmacao.texto}</p>
            <div className="alp-acoes">
              <button ref={botaoCancelar} type="button" className="alp-cancelar" onClick={() => responder(false)}>Cancelar</button>
              <button type="button" className="alp-confirmar" onClick={() => responder(true)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
