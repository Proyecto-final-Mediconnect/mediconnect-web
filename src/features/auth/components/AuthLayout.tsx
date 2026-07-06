import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../../shared/ui/Logo';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const trustPoints = [
  {
    title: 'Consulta segura',
    text: 'Tus datos protegidos con cifrado de extremo a extremo.',
  },
  {
    title: 'Agenda flexible',
    text: 'Reservá turnos en el horario que mejor te quede.',
  },
  {
    title: 'Profesionales verificados',
    text: 'Especialistas validados, a tu disposición.',
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh">
      {/* Panel de marca (desktop) */}
      <aside className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-deep to-brand p-12 text-white lg:flex">
        <Link to="/">
          <Logo tone="light" />
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Tu salud, conectada en un solo lugar.
          </h2>
          <ul className="mt-8 flex flex-col gap-5">
            {trustPoints.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm"
                >
                  ✓
                </span>
                <div>
                  <p className="font-semibold">{point.title}</p>
                  <p className="text-sm text-white/80">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} MediConnect
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
