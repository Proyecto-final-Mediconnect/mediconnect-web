import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../../shared/ui/Logo';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Eyebrow en mayúsculas sobre el título, como en las secciones del diseño. */
  eyebrow?: string;
  /** Reemplaza los puntos por defecto del panel oscuro. */
  aside?: ReactNode;
};

/**
 * Marco de las pantallas de sesión: panel oscuro a la izquierda, formulario a
 * la derecha.
 *
 * **El canvas no tiene pantallas de login ni de registro**, así que esto no
 * replica un diseño: lo extiende. Las piezas salen del mismo vocabulario que el
 * resto —fondo `night`, título en Newsreader 400, eyebrow en mayúsculas con
 * tracking, viñetas teal— para que no se note la costura.
 *
 * El panel oscuro se oculta en pantalla chica en vez de apilarse: es refuerzo
 * de marca, no información, y arriba del formulario solo agregaría scroll entre
 * el usuario y lo que vino a hacer.
 */

const PUNTOS_POR_DEFECTO = [
  {
    titulo: 'Tu historia clínica es tuya',
    texto: 'Podés verla completa, descargarla y llevártela cuando quieras.',
  },
  {
    titulo: 'Cada acceso queda registrado',
    texto: 'Sabés qué profesional la abrió, cuándo y qué parte miró.',
  },
  {
    titulo: 'Matrículas verificadas',
    texto: 'Nadie publica su perfil sin que su matrícula esté controlada y vigente.',
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
  aside,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-1/2 flex-col justify-between bg-night p-12 text-white lg:flex">
        <Link to="/" className="flex items-center" aria-label="MediConnect — inicio">
          <Logo tone="light" className="h-[30px]" />
        </Link>

        {aside ?? (
          <div className="max-w-md">
            <h2 className="font-display text-[34px] leading-[1.15] text-white text-pretty">
              Tu salud, en un solo lugar y siempre con vos.
            </h2>

            <ul className="mt-8 grid gap-5">
              {PUNTOS_POR_DEFECTO.map((punto) => (
                <li key={punto.titulo} className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="relative top-2 h-[7px] w-[7px] flex-none rounded-full bg-brand-bright"
                  />
                  <div>
                    <p className="text-[15px] font-semibold text-white">{punto.titulo}</p>
                    <p className="mt-1 text-sm leading-[1.6] text-on-night">{punto.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] font-semibold tracking-[0.06em] text-footer-label">
          © {new Date().getFullYear()} MEDICONNECT
        </p>
      </aside>

      <main className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center" aria-label="MediConnect — inicio">
              <Logo className="h-[30px]" />
            </Link>
          </div>

          {eyebrow && (
            <div className="flex items-center gap-3 border-t border-brand-deep pt-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {eyebrow}
              </span>
            </div>
          )}

          <h1
            className={`font-display text-[32px] leading-[1.15] text-brand-deep ${
              eyebrow ? 'mt-5' : ''
            }`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 text-[15px] leading-[1.65] text-muted text-pretty">{subtitle}</p>
          )}

          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
