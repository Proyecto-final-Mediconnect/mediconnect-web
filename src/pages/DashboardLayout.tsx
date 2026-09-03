import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../shared/ui/AppShell';

type DashboardLayoutProps = {
  /** Título corto de la barra superior: dice en qué sección estás. */
  barTitle: string;
  /** Saludo grande del contenido. En el diseño va en Newsreader. */
  greeting: string;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Estructura común de los dashboards por rol (ENG-44), con el diseño del canvas.
 *
 * El título se parte en dos a propósito. La barra superior lleva el nombre de la
 * sección ("Panel"), que es información de navegación y no cambia; el saludo
 * ("Hola, Marina.") vive en el contenido, en Newsreader y en grande, porque es
 * lo primero que se lee y no un rótulo.
 */
export function DashboardLayout({
  barTitle,
  greeting,
  subtitle,
  children,
}: DashboardLayoutProps) {
  return (
    <AppShell title={barTitle}>
      <h2 className="font-display text-[30px] leading-[1.1] text-brand-deep lg:text-[36px]">
        {greeting}
      </h2>
      {subtitle && <p className="mt-2.5 text-base text-muted">{subtitle}</p>}
      <div className="mt-[26px]">{children}</div>
    </AppShell>
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
    <div className="rounded-[14px] border border-dashed border-line-strong bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-brand-deep">{title}</h3>
        <span className="rounded-full bg-surface-teal px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-brand-hover">
          {issue}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.6] text-muted">{description}</p>
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
      className="block rounded-[14px] border border-line bg-white p-6 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <h3 className="text-base font-bold text-brand-deep">{title}</h3>
      <p className="mt-[7px] text-[13px] leading-[1.6] text-muted">{description}</p>
      <span className="mt-3 inline-block text-[13px] font-semibold text-brand-hover">
        Abrir →
      </span>
    </Link>
  );
}
