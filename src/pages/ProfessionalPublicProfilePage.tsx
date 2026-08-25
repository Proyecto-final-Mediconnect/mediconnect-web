import { Link, useParams } from 'react-router-dom';
import { PublicProfile } from '../features/catalog/components/PublicProfile';
import { usePublicProfile } from '../features/catalog/hooks/usePublicProfile';
import { ApiError } from '../shared/lib/httpClient';
import { Button } from '../shared/ui/Button';
import { Logo } from '../shared/ui/Logo';

/**
 * Perfil público de un profesional (ENG-50). Ruta abierta, igual que el
 * catálogo: no la envuelve ningún guard y no dispara GET /auth/me.
 *
 * Cierra el recorrido catálogo → perfil → reserva. La reserva sí es privada,
 * así que el salto a login lo hace `RequireAuth` desde la ruta de turnos.
 */
export function ProfessionalPublicProfilePage() {
  const { professionalId = '' } = useParams<{ professionalId: string }>();
  const profile = usePublicProfile(professionalId);

  return (
    <div className="min-h-svh bg-surface">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Ir al inicio">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/ingresar">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link to="/registro">
              <Button variant="primary">Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/profesionales" className="text-sm text-muted hover:text-ink">
          ← Volver al catálogo
        </Link>

        <div className="mt-6">
          <PublicProfile
            profile={profile.data}
            isLoading={profile.isPending}
            isError={profile.isError}
            isNotFound={profile.error instanceof ApiError && profile.error.status === 404}
            errorMessage={profile.error?.message}
            onRetry={() => void profile.refetch()}
          />
        </div>
      </main>
    </div>
  );
}
