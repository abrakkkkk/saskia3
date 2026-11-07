import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import './documentos.css';

// Cartões de documento e de atalho para Biblioteca, Vacinação e Curvas de crescimento.
// Estilos em documentos.css, apenas com tokens --ui-*.

export function DocSection({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="ui-doc-secao">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

export function DocGrid({ children }: { children: ReactNode }) {
  return <div className="ui-doc-grid">{children}</div>;
}

/** Documento com as ações Ver e Baixar. O título é h2 quando não há seção acima, h3 dentro de DocSection. */
export function DocCard({ icone, titulo, nivel = 3, onVer, onBaixar, hrefVer, hrefBaixar }: {
  icone: ReactNode;
  titulo: string;
  nivel?: 2 | 3;
  onVer?: () => void;
  onBaixar?: () => void;
  /** Endereço do arquivo: vira link de verdade (nova aba), que nenhum bloqueador de pop-up impede. */
  hrefVer?: string;
  hrefBaixar?: string;
}) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  return (
    <article className="ui-doc">
      <div className="ui-doc-topo">
        <span className="ui-doc-icone ui-tone-info" aria-hidden="true">{icone}</span>
        <Titulo>{titulo}</Titulo>
      </div>
      <div className="ui-doc-acoes">
        {hrefVer ? (
          <a className="btn btn-primary" href={hrefVer} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${titulo}`}>Ver</a>
        ) : (
          <button type="button" className="btn btn-primary" aria-label={`Ver ${titulo}`} onClick={onVer}>Ver</button>
        )}
        {hrefBaixar ? (
          <a className="btn btn-secondary" href={hrefBaixar} download aria-label={`Baixar ${titulo}`}>Baixar</a>
        ) : (
          <button type="button" className="btn btn-secondary" aria-label={`Baixar ${titulo}`} onClick={onBaixar}>Baixar</button>
        )}
      </div>
    </article>
  );
}

/** Ferramenta externa com categoria e uma ação principal. */
export function DocFerramenta({ icone, titulo, descricao, categoria, rotuloAcao, onAcao }: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  categoria: string;
  rotuloAcao: string;
  onAcao: (botao: HTMLButtonElement) => void;
}) {
  return (
    <article className="ui-doc">
      <div className="ui-doc-topo">
        <span className="ui-doc-icone ui-tone-info" aria-hidden="true">{icone}</span>
        <div>
          <h2>{titulo}</h2>
          <p>{descricao}</p>
        </div>
      </div>
      <div className="ui-doc-meta"><Badge>{categoria}</Badge></div>
      <button type="button" className="btn btn-secondary" onClick={evento => onAcao(evento.currentTarget)}>
        {rotuloAcao} <i className="las la-external-link-alt" aria-hidden="true"></i>
      </button>
    </article>
  );
}

/** Atalho para outra tela. O cartão inteiro é o link. */
export function DocAtalho({ href, icone, titulo, descricao }: {
  href: string;
  icone: ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <Link href={href} className="ui-doc ui-doc-atalho">
      <div className="ui-doc-topo">
        <span className="ui-doc-icone ui-tone-info" aria-hidden="true">{icone}</span>
        <div>
          <h2>{titulo}</h2>
          <p>{descricao}</p>
        </div>
      </div>
    </Link>
  );
}

