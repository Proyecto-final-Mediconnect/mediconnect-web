import { useSession } from '../features/auth/hooks/useSession';
import { DashboardLayout, PendingCard } from './DashboardLayout';

export function PatientDashboardPage() {
  const { user } = useSession();
  const saludo = user?.firstName ? `Hola, ${user.firstName}` : 'Hola';

  return (
    <DashboardLayout
      title={saludo}
      subtitle="Este es tu espacio en MediConnect."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <PendingCard
          title="Buscar profesionales"
          description="Explorá el catálogo de especialistas verificados y reservá tu turno."
          issue="ENG-49"
        />
        <PendingCard
          title="Mis turnos"
          description="Vas a ver acá tus consultas agendadas y su estado."
          issue="ENG-55"
        />
        <PendingCard
          title="Mi historia clínica"
          description="Tu historial médico, siempre disponible y solo accesible por vos."
          issue="ENG-59"
        />
      </div>
    </DashboardLayout>
  );
}
