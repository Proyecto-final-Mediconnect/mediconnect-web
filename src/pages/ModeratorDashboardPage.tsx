import { DashboardLayout, PendingCard } from './DashboardLayout';

export function ModeratorDashboardPage() {
  return (
    <DashboardLayout
      barTitle="Moderación"
      greeting="Panel de moderación"
      subtitle="Revisión de las reseñas que publican los pacientes."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PendingCard
          title="Reseñas pendientes"
          description="Aprobá o rechazá las reseñas que dejan los pacientes sobre los profesionales."
          issue="ENG-81"
        />
      </div>
    </DashboardLayout>
  );
}
