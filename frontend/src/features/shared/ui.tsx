import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ApiError } from '../../api/errors';
import { Badge } from '../../components/Badge';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { estadoInfo } from './format';

export function EstadoBadge({ estado }: { estado: string }) {
  const info = estadoInfo(estado);
  return <Badge tone={info.tone} label={info.label} />;
}

/** Shows loading and error states of a query, then renders its data. */
export function QueryView<T>({ query, loading, children }: {
  query: UseQueryResult<T, ApiError>; loading: string; children(data: T): ReactNode;
}) {
  if (query.isPending) return <LoadingState label={loading} />;
  if (query.isError) {
    return query.error.kind === 'stale-session' ? null : <ErrorState message={query.error.message} onRetry={() => { void query.refetch(); }} />;
  }
  return <>{children(query.data)}</>;
}

export function Alerta({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return <div role="alert" className="grid gap-1 rounded-control border border-error p-3 text-error">
    {messages.map((message, index) => <p key={index}>{message}</p>)}
  </div>;
}

export function Seccion({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="ui-panel grid gap-4 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-medium text-ink">{title}</h2>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    {children}
  </section>;
}

export function Datos({ values }: { values: readonly (readonly [string, ReactNode])[] }) {
  return <dl className="grid gap-4 sm:grid-cols-2">
    {values.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="ui-mono text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words">{value === null || value === undefined || value === '' ? '—' : value}</dd>
    </div>)}
  </dl>;
}

export function EnlaceBoton({ to, children, variant = 'secundario' }: { to: string; children: ReactNode; variant?: 'primario' | 'secundario' }) {
  return <Link to={to} className={`ui-button ui-button--${variant}`}>{children}</Link>;
}

export function Filtros({ children }: { children: ReactNode }) {
  return <div className="ui-grid-bg grid gap-4 border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function Progreso({ porcentaje, label }: { porcentaje: number; label: string }) {
  return <div className="grid gap-1">
    <div className="flex justify-between gap-3 text-sm"><span>{label}</span><span className="ui-mono">{porcentaje}%</span></div>
    <div role="progressbar" aria-label={label} aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} className="h-3 overflow-hidden border border-border bg-tint">
      <div className="h-full bg-[image:var(--gradient-rule)]" style={{ width: `${porcentaje}%` }} />
    </div>
  </div>;
}
