import { Link } from 'react-router-dom';
import { useSession } from '../../features/auth/hooks/useSession';
import {
  dashboardPathFor,
  displayNameOf,
  initialsOf,
  ROLE_LABEL,
  type SessionUser,
} from '../../features/auth/types/session';
import { Logo } from './Logo';

/**
 * Barra superior de las pantallas públicas (landing, catálogo, perfil público).
 *
 * Vive acá y no dentro de cada página porque en el diseño es literalmente la
 * misma barra: si se duplica, la primera vez que alguien agregue un enlace las
 * pantallas empiezan a divergir.
 *
 * En pantalla chica sobrevive solo el bloque de la derecha —"Ingresar" y "Crear
 * cuenta", o el avatar si hay sesión—. El catálogo no se pierde: la landing lo
 * ofrece en el CTA del hero y el resto de las páginas públicas ya están adentro
 * de él. Un menú hamburguesa sería inventar algo que el diseño no define.
 *
 * Ojo con una consecuencia: desde que la barra muestra la sesión, **las páginas
 * públicas piden `GET /me`**. Es una request extra para el visitante anónimo
 * (401 y listo) y revierte la decisión anterior de que la landing no preguntara
 * quién sos. Se cambió a propósito, porque no saber que había una sesión abierta
 * producía redirecciones que parecían un bug.
 */

/** Ancho y respiración compartidos con las secciones de las páginas públicas. */
export const PUBLIC_SHELL = 'mx-auto w-full max-w-[1240px] px-6 md:px-10';

export function PublicHeader() {
  const { user, isLoading } = useSession();

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
          {isLoading ? <RanuraSesion /> : user ? <BloqueSesion user={user} /> : <Anonimo />}
        </nav>
      </div>
    </header>
  );
}

/**
 * Hueco del ancho aproximado del bloque de sesión, mientras `GET /me` responde.
 *
 * Se deja vacío a propósito en vez de mostrar "Ingresar": dibujar la variante de
 * anónimo y cambiarla 200 ms después le dice al usuario logueado que no tiene
 * sesión, aunque sea por un instante. Un hueco no afirma nada, y al reservar el
 * ancho el resto de la barra no salta cuando llega la respuesta.
 */
function RanuraSesion() {
  return <div aria-hidden="true" className="h-[42px] w-[150px] md:w-[210px]" />;
}

function Anonimo() {
  return (
    <>
      <HeaderLink to="/ingresar" tone="muted">
        Ingresar
      </HeaderLink>
      <Link
        to="/registro"
        className="ml-1 whitespace-nowrap rounded-[9px] bg-brand-deep px-3.5 py-[11px] text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:ml-2 md:px-[18px]"
      >
        Crear cuenta
      </Link>
    </>
  );
}

/**
 * Quién tiene la sesión abierta, en las pantallas públicas.
 *
 * Antes la landing y el catálogo no preguntaban quién sos, y el header decía
 * siempre "Ingresar / Crear cuenta". El problema no era estético: un profesional
 * logueado tocaba "Reservar turno" y lo devolvían a su panel sin explicación,
 * porque en ningún lado se veía que había una sesión —y menos de qué rol—.
 *
 * Es un enlace y no un desplegable a propósito: el logout ya vive en la barra
 * lateral de la app, y un menú acá sería una pieza nueva para duplicarlo. El rol
 * se muestra siempre, porque es justamente el dato que faltaba.
 */
function BloqueSesion({ user }: { user: SessionUser }) {
  return (
    <Link
      to={dashboardPathFor(user.role)}
      // Con el nombre y el rol solos, en pantalla nada dice que esto lleva a
      // algún lado. Para quien ve el bloque alcanza —un avatar en una barra se
      // lee como acceso a la cuenta—, pero quien lo escucha oiría un enlace
      // llamado "Ana García Profesional" y no sabría a dónde va.
      aria-label={`${displayNameOf(user)} — ir a mi panel`}
      className="ml-1 flex items-center gap-2.5 rounded-[9px] border border-line-strong bg-white py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:ml-2 md:pr-3.5"
    >
      <span
        aria-hidden="true"
        className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-brand-hover text-[11px] font-bold text-white"
      >
        {initialsOf(user)}
      </span>
      {/* En pantalla chica queda solo el avatar: el nombre completo más el rol no
          entran al lado del logo sin empujar el catálogo fuera de la barra. */}
      <span className="hidden min-w-0 text-left sm:grid">
        <span className="truncate text-[13px] font-bold leading-tight text-brand-deep">
          {displayNameOf(user)}
        </span>
        <span className="text-[11px] font-medium leading-tight text-muted">
          {ROLE_LABEL[user.role]}
        </span>
      </span>
    </Link>
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
