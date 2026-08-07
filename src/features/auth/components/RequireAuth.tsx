import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { dashboardPathFor, type UserRole } from '../types/session';

type RequireAuthProps = {
  children: ReactNode;
  /** Si se indica, solo estos roles pueden entrar; el resto va a su propio
   *  dashboard (no a un 403, para no dejar al usuario en un callejón). */
  allow?: UserRole[];
};

export function RequireAuth({ children, allow }: RequireAuthProps) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-svh items-center justify-center text-muted"
      >
        Cargando…
      </div>
    );
  }

  if (!user) {
    // Guardamos a dónde quería ir para volver ahí después de loguearse.
    return <Navigate to="/ingresar" replace state={{ from: location }} />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  return <>{children}</>;
}
