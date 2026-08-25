import { useSession } from '../features/auth/hooks/useSession';
import { DashboardLayout, PendingCard, SectionCard } from './DashboardLayout';

export function PatientDashboardPage() {
  const { user } = useSession();
  const saludo = user?.firstName ? `Hola, ${user.firstName}` : 'Hola';

  return (
    <DashboardLayout title={saludo} subtitle="Este es tu espacio en MediConnect.">
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard
          title="Buscar profesionales"
          description="Explorá el catálogo de especialistas verificados y reservá tu turno."
          to="/profesionales"
        />
        <SectionCard
          title="Mis turnos"
          description="Tus consultas agendadas, su estado y las que ya pasaron."
          to="/mis-turnos"
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
