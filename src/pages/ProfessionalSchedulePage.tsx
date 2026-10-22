import { CancellationPolicyForm } from '../features/cancellation-policy/components/CancellationPolicyForm';
import { WeeklyScheduleForm } from '../features/schedule/components/WeeklyScheduleForm';
import { DashboardLayout } from './DashboardLayout';

/**
 * Agenda semanal del profesional (ENG-53).
 *
 * Va dentro del shell privado, igual que el resto de las pantallas con sesión.
 * Abajo, la política de cancelación (ENG-171), que se guarda aparte.
 */
export function ProfessionalSchedulePage() {
  return (
    <DashboardLayout
      barTitle="Mi agenda"
      subtitle="Definí cuándo atendés. Los pacientes solo van a poder reservar en esos horarios."
    >
      <div className="grid gap-6">
        <WeeklyScheduleForm />
        <CancellationPolicyForm />
      </div>
    </DashboardLayout>
  );
}
