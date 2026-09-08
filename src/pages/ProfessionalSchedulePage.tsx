import { WeeklyScheduleForm } from '../features/schedule/components/WeeklyScheduleForm';
import { DashboardLayout } from './DashboardLayout';

/**
 * Agenda semanal del profesional (ENG-53).
 *
 * Va dentro del shell privado, igual que el resto de las pantallas con sesión.
 */
export function ProfessionalSchedulePage() {
  return (
    <DashboardLayout
      barTitle="Mi agenda"
      subtitle="Definí cuándo atendés. Los pacientes solo van a poder reservar en esos horarios."
    >
      <WeeklyScheduleForm />
    </DashboardLayout>
  );
}
