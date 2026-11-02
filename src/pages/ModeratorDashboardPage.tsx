import { ModerationQueue } from '../features/reviews/components/ModerationQueue';
import { DashboardLayout } from './DashboardLayout';

/** Moderación de reseñas (ENG-81): la única pantalla del rol moderador. */
export function ModeratorDashboardPage() {
  return (
    <DashboardLayout
      barTitle="Moderación"
      subtitle="Revisá las reseñas que dejan los pacientes antes de que se publiquen."
    >
      <ModerationQueue />
    </DashboardLayout>
  );
}
