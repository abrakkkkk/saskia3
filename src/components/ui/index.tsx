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

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="ui-stat-grid">{children}</div>;
}

export function StatCard({ icon, value, label, tone = 'info', hint }: {
  icon?: string;
  value: ReactNode;
  label: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className={`ui-stat ui-tone-${tone}`}>
      {icon && <span className="ui-stat-icon"><i className={icon} aria-hidden="true"></i></span>}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
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
