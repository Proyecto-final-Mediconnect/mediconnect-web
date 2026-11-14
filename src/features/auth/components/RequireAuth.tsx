import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Logo } from '../../../shared/ui/Logo';
import { LegalAcceptanceGate } from '../../legal/components/LegalAcceptanceGate';
import { useSession } from '../hooks/useSession';
import { dashboardPathFor, type UserRole } from '../types/session';

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

export function RequireAuth({ children, allow, skipLegal = false }: RequireAuthProps) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;

  if (!user) {
    // Guardamos a dónde quería ir para volver ahí después de loguearse.
    return <Navigate to="/ingresar" replace state={{ from: location }} />;
  }

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
