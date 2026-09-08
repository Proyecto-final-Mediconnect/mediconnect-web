import { useParams } from 'react-router-dom';
import { PublicProfile } from '../features/catalog/components/PublicProfile';
import {
  isMissingProfileError,
  usePublicProfile,
} from '../features/catalog/hooks/usePublicProfile';
import { PUBLIC_SHELL, PublicHeader } from '../shared/ui/PublicHeader';

/**
 * Perfil público de un profesional (ENG-50). Ruta abierta, igual que el
 * catálogo: no la envuelve ningún guard y no dispara GET /auth/me.
 *
 * Cierra el recorrido catálogo → perfil → reserva. La reserva sí es privada,
 * así que el salto a login lo hace `RequireAuth` desde la ruta de turnos.
 *
 * El enlace de vuelta al catálogo vive adentro de `PublicProfile`, arriba del
 * nombre, como en el diseño. Acá no va otro: dos "volver" en la misma pantalla
 * es una de las dos de más.
 */
export function ProfessionalPublicProfilePage() {
  const { professionalId = '' } = useParams<{ professionalId: string }>();
  const profile = usePublicProfile(professionalId);

  return (
    <div className="min-h-svh bg-surface">
      <PublicHeader />

      <main className={`${PUBLIC_SHELL} pb-[88px] pt-8`}>
        <PublicProfile
          profile={profile.data}
          isLoading={profile.isPending}
          isError={profile.isError}
          isNotFound={isMissingProfileError(profile.error)}
          errorMessage={profile.error?.message}
          onRetry={() => void profile.refetch()}
        />
      </main>
    </div>
  );
}
