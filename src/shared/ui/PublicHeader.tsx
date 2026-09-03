import { Link } from 'react-router-dom';
import { Logo } from './Logo';

/**
 * Barra superior de las pantallas públicas (landing, catálogo, perfil público).
 *
 * Vive acá y no dentro de cada página porque en el diseño es literalmente la
 * misma barra: si se duplica, la primera vez que alguien agregue un enlace las
 * pantallas empiezan a divergir.
 *
 * En pantalla chica sobreviven solo "Ingresar" y "Crear cuenta". El catálogo no
 * se pierde —la landing lo ofrece en el CTA del hero y el resto de las páginas
 * públicas ya están adentro de él—, y un menú hamburguesa sería inventar algo
 * que el diseño no define.
 */

/** Ancho y respiración compartidos con las secciones de las páginas públicas. */
export const PUBLIC_SHELL = 'mx-auto w-full max-w-[1240px] px-6 md:px-10';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className={`${PUBLIC_SHELL} flex items-center justify-between gap-6 py-[15px]`}>
        <Link to="/" className="flex items-center" aria-label="MediConnect — inicio">
          <Logo className="h-[30px]" />
        </Link>

        <nav className="flex items-center gap-1">
          <HeaderLink to="/profesionales" hideOnMobile>
            Buscar profesionales
          </HeaderLink>
          <HeaderLink to="/#medipass" hideOnMobile>
            MediPass
          </HeaderLink>
          <HeaderLink to="/registro/profesional" hideOnMobile>
            Soy profesional
          </HeaderLink>
          <HeaderLink to="/ingresar" tone="muted">
            Ingresar
          </HeaderLink>
          <Link
            to="/registro"
            className="ml-1 whitespace-nowrap rounded-[9px] bg-brand-deep px-3.5 py-[11px] text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:ml-2 md:px-[18px]"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({
  to,
  children,
  tone = 'deep',
  hideOnMobile = false,
}: {
  to: string;
  children: React.ReactNode;
  tone?: 'deep' | 'muted';
  hideOnMobile?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-2.5 py-[9px] text-sm font-semibold transition-colors md:px-[13px] ${
        hideOnMobile ? 'hidden md:inline-block' : ''
      } ${tone === 'muted' ? 'text-muted hover:bg-surface' : 'text-brand-deep hover:bg-surface-teal'}`}
    >
      {children}
    </Link>
  );
}
