import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useLogout, useSession } from '../../features/auth/hooks/useSession';

/**
 * Marco de las pantallas privadas: barra lateral oscura fija y barra superior
 * pegada con el título de la pantalla.
 *
 * Reemplaza al header horizontal que había. El cambio no es estético: con
 * navegación lateral el usuario ve **dónde está y a dónde puede ir** sin abrir
 * nada, que es justo lo que un panel con cuatro o cinco secciones necesita.
 *
 * **Los ítems del menú salen de las rutas que existen de verdad.** El canvas
 * lista además Historia clínica, MediPass, Gestión de accesos y QR de
 * emergencia, pero esas pantallas todavía no están construidas y un menú que
 * lleva a la nada es peor que un menú corto.
 *
 * En pantalla chica la barra lateral pasa a ser una fila de pestañas arriba del
 * contenido: apilar seis ítems a lo alto empujaría la pantalla entera fuera de
 * vista.
 */

type NavItem = { to: string; label: string; end?: boolean };

const NAV_PACIENTE: NavItem[] = [
  { to: '/paciente', label: 'Panel', end: true },
  { to: '/mis-turnos', label: 'Mis turnos' },
  { to: '/profesionales', label: 'Buscar profesionales' },
  { to: '/perfil/paciente', label: 'Mi perfil' },
];

const NAV_PROFESIONAL: NavItem[] = [
  { to: '/profesional', label: 'Panel', end: true },
  { to: '/profesional/agenda', label: 'Mi agenda' },
  { to: '/mis-turnos', label: 'Mis consultas' },
  { to: '/perfil', label: 'Mi perfil público' },
];

type AppShellProps = {
  /** Título de la barra superior. */
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  const { user } = useSession();
  const { mutate: logout, isPending } = useLogout();

  const items = user?.role === 'PROFESIONAL' ? NAV_PROFESIONAL : NAV_PACIENTE;
  const nombre = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : (user?.email ?? '');
  const iniciales =
    (user?.firstName?.charAt(0) ?? '') + (user?.lastName?.charAt(0) ?? '') || '·';
  const rol = user?.role === 'PROFESIONAL' ? 'Profesional' : 'Paciente';

  return (
    <div className="min-h-svh bg-surface lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="bg-night px-4 py-6 lg:sticky lg:top-0 lg:grid lg:h-svh lg:content-start lg:gap-6">
        <Link to="/" className="flex items-center gap-2.5 px-2" aria-label="MediConnect — inicio">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-ink-deep"
          >
            M
          </span>
          <span className="text-[17px] font-bold tracking-[-0.01em] text-white">MediConnect</span>
        </Link>

        <nav className="mt-6 flex gap-1 overflow-x-auto lg:mt-0 lg:grid lg:gap-[3px] lg:overflow-visible">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-on-night hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 grid gap-3.5 border-t border-white/10 pt-4 lg:mt-0 lg:pt-[18px]">
          <div className="flex items-center gap-2.5 px-1.5">
            <span
              aria-hidden="true"
              className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand-hover text-xs font-bold text-white"
            >
              {iniciales.toUpperCase()}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-[13px] font-bold text-white">{nombre}</span>
              <span className="text-[11px] font-medium text-on-night-soft">{rol}</span>
            </span>
          </div>

          {/* Al limpiarse la sesión, RequireAuth redirige solo al login: una
              sola fuente de verdad para la navegación post-logout. */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => logout()}
            className="rounded-lg border border-white/[0.18] py-2.5 text-xs font-semibold text-on-night-soft transition-colors hover:border-brand-bright hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright disabled:opacity-60"
          >
            {isPending ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-[66px] items-center border-b border-line bg-white px-6 lg:px-9">
          <h1 className="text-[22px] font-bold text-brand-deep">{title}</h1>
        </div>

        <main className="px-6 pb-[72px] pt-8 lg:px-9">
          <div className="max-w-[1220px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
