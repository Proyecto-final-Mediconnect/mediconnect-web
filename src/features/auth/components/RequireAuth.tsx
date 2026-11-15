import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Logo } from '../../../shared/ui/Logo';
import { LegalAcceptanceGate } from '../../legal/components/LegalAcceptanceGate';
import { useLogout, useSession } from '../hooks/useSession';
import { dashboardPathFor, isKnownRole, type UserRole } from '../types/session';

type RequireAuthProps = {
  children: ReactNode;
  /** Si se indica, solo estos roles pueden entrar; el resto va a su propio
   *  dashboard (no a un 403, para no dejar al usuario en un callejón). */
  allow?: UserRole[];
  /**
   * Deja entrar aunque no haya aceptado los textos legales vigentes. Solo para
   * `/privacidad` (ENG-86): ejercer un derecho no puede depender de aceptarlos.
   */
  skipLegal?: boolean;
};

/** Tras este tiempo se avisa que el servidor está arrancando (Render en frío tarda hasta ~60 s). */
const AVISO_SERVIDOR_MS = 8000;

/** Pantalla de carga de la sesión: logo sobre el fondo de la app, no un texto suelto. */
function SessionLoading() {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setLento(true), AVISO_SERVIDOR_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface px-4 text-center"
    >
      <Logo variant="lockup" className="h-12 animate-pulse" alt="MediConnect" />
      <p className="text-sm text-muted">
        {lento ? 'Despertando el servidor… puede tardar un minuto.' : 'Cargando…'}
      </p>
    </div>
  );
}

/** Sesión con un rol que la app ya no usa (p. ej. MODERADOR, que sigue en la
 *  base): no hay dashboard ni menú que mostrarle, así que ni siquiera se
 *  entra a la app. Lo único útil es poder cerrar sesión. */
function UnsupportedRole() {
  const logout = useLogout();
  return (
    <main className="flex min-h-svh items-center justify-center bg-surface px-4 py-10">
      <section
        role="alert"
        className="grid w-full max-w-[460px] gap-4 rounded-[14px] border border-line bg-white p-7 text-center"
      >
        <h1 className="font-display text-[22px] text-brand-deep">Tu cuenta no tiene acceso</h1>
        <p className="text-sm leading-[1.7] text-muted">
          El rol de esta cuenta ya no existe en MediConnect. Escribinos a soporte para que lo
          actualicemos.
        </p>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-[13px] font-semibold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

export function RequireAuth({ children, allow, skipLegal = false }: RequireAuthProps) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;

  if (!user) {
    // Guardamos a dónde quería ir para volver ahí después de loguearse.
    return <Navigate to="/ingresar" replace state={{ from: location }} />;
  }

  // `user.role` viene de la base y puede no ser uno de los dos del tipo.
  if (!isKnownRole(user.role)) return <UnsupportedRole />;

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  // Sin consentimiento no se tratan sus datos de salud (ENG-140): antes que
  // cualquier pantalla de la app, los textos legales. `=== false` y no `!`: un
  // backend que todavía no informa el campo no bloquea a nadie.
  if (user.legalAccepted === false && !skipLegal) {
    return <LegalAcceptanceGate />;
  }

  return <>{children}</>;
}
