import { ProfessionalProfileForm } from '../features/profile/components/ProfessionalProfileForm';
import { DashboardLayout } from './DashboardLayout';

/**
 * Perfil público del profesional (ENG-48), del lado de quien lo edita.
 *
 * Va dentro del shell privado, igual que el resto de las pantallas con sesión.
 */
export function ProfessionalProfilePage() {
  return (
    <DashboardLayout
      barTitle="Mi perfil público"
      subtitle="Completá tu perfil para que los pacientes te encuentren y elijan."
    >
      <ProfessionalProfileForm />
    </DashboardLayout>
  );
}
