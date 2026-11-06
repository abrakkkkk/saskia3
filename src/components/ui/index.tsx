import type { ReactNode } from 'react';

// Blocos visuais compartilhados. Estilos em globals.css, seção "DESIGN SYSTEM".

export function PageHeader({ icon, title, subtitle, actions }: {
  icon?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div>
        <h1>{icon && <i className={icon} aria-hidden="true"></i>} {title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}

/** `auto` reparte as matizes por posição dentro do StatGrid; os demais têm significado fixo. */
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'violet' | 'teal' | 'cyan' | 'rose' | 'yellow' | 'auto';

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="ui-stat-grid">{children}</div>;
}

/**
 * Indicador compacto. Cada tom tem matiz própria; com valor, o cartão ganha fundo e ladrilho
 * sólidos, e o zero perde o peso (cartão branco, ladrilho pálido) sem virar cinza. `alerta`
 * destaca a borda do que exige ação. A explicação longa vai em `hint`, que aparece como tooltip.
 */
export function StatCard({ icon, value, label, tone = 'auto', hint, alerta = false }: {
  icon?: string;
  value: ReactNode;
  label: string;
  tone?: Tone;
  hint?: string;
  alerta?: boolean;
}) {
  const zero = value === 0 || value === '0';
  return (
    <div className={`ui-stat ui-tone-${tone}${zero ? ' ui-stat-zero' : alerta ? ' ui-stat-alerta' : ''}`} title={hint}>
      {icon && <span className="ui-stat-icon"><i className={icon} aria-hidden="true"></i></span>}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export type Risco = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';

const RISCO_ROTULO: Record<Risco, string> = {
  vermelho: 'Vermelho', laranja: 'Laranja', amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul',
};

/** Classificação de risco (Manchester). Aceita o texto do banco em qualquer caixa. */
export function RiscoBadge({ classificacao }: { classificacao?: string | null }) {
  const chave = classificacao?.trim().toLowerCase() as Risco | undefined;
  if (!chave || !(chave in RISCO_ROTULO)) return <span className="ui-risco">Sem classificação</span>;
  return <span className={`ui-risco ui-risco-${chave}`}>{RISCO_ROTULO[chave]}</span>;
}

export type TabItem<T extends string> = { id: T; label: string; icon?: string };

export function Tabs<T extends string>({ tabs, active, onChange, label }: {
  tabs: readonly TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={active === tab.id ? 'ativa' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <i className={tab.icon} aria-hidden="true"></i>} {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, icon, actions, children }: {
  title?: string;
  icon?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ui-panel">
      {(title || actions) && (
        <div className="ui-panel-header">
          {title && <h2>{icon && <i className={icon} aria-hidden="true"></i>} {title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function SearchInput({ value, onChange, placeholder, label }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <div className="ui-search">
      <i className="las la-search" aria-hidden="true"></i>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
      />
    </div>
  );
}

export function EmptyState({ icon = 'las la-inbox', message, action }: {
  icon?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty">
      <i className={icon} aria-hidden="true"></i>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="ui-empty" role="status">
      <i className="las la-spinner la-spin" aria-hidden="true"></i>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ui-empty ui-empty-erro" role="alert">
      <i className="las la-exclamation-triangle" aria-hidden="true"></i>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn-primary" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ui-badge ui-tone-${tone}`}>{children}</span>;
}
