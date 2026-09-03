import { useParams } from 'react-router-dom';
import { PublicProfile } from '../features/catalog/components/PublicProfile';
import {
  isMissingProfileError,
  usePublicProfile,
} from '../features/catalog/hooks/usePublicProfile';
import { DashboardLayout } from './DashboardLayout';

/**
 * El perfil de un profesional dentro de la app.
 *
 * Mismo contenido que `/profesionales/:id`, otro marco. Sin esto, entrar a un
 * perfil desde el catálogo de adentro te devolvía a la página pública a mitad del
 * recorrido: el "volver" te llevaba al catálogo público y el encabezado te
 * ofrecía crear una cuenta que ya tenías.
 */
export function PatientProfessionalProfilePage() {
  const { professionalId = '' } = useParams<{ professionalId: string }>();
  const profile = usePublicProfile(professionalId);

  return (
    <DashboardLayout barTitle="Perfil del profesional">
      <PublicProfile
        profile={profile.data}
        isLoading={profile.isPending}
        isError={profile.isError}
        isNotFound={isMissingProfileError(profile.error)}
        errorMessage={profile.error?.message}
        onRetry={() => void profile.refetch()}
        basePath="/buscar"
      />
    </DashboardLayout>
  );
}
