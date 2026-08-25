import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../shared/ui/AppHeader';

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/** Estructura común de los dashboards por rol (ENG-44). */
export function DashboardLayout({
  title,
  subtitle,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-svh bg-surface">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-brand-deep">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

/** Placeholder de una sección todavía no implementada, para que el dashboard
 *  comunique qué viene sin simular funcionalidad que no existe. */
export function PendingCard({
  title,
  description,
  issue,
}: {
  title: string;
  description: string;
  issue: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        <span className="rounded-full bg-surface-teal px-2.5 py-0.5 text-xs font-medium text-brand-hover">
          {issue}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

/** Sección ya implementada: misma tarjeta, pero navegable. Se distingue de
 *  `PendingCard` por el borde sólido, para que el dashboard muestre de un
 *  vistazo qué se puede usar y qué todavía no. */
export function SectionCard({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <span className="mt-3 inline-block text-sm font-medium text-brand">
        Abrir →
      </span>
    </Link>
  );
}
