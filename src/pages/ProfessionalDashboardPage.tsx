import { useSession } from '../features/auth/hooks/useSession';
import { DashboardLayout, SectionCard } from './DashboardLayout';

export function ProfessionalDashboardPage() {
  const { user } = useSession();
  const saludo = user?.firstName ? `Buen día, ${user.firstName}.` : 'Buen día.';

  return (
    <DashboardLayout
      barTitle="Panel"
      greeting={saludo}
      subtitle="Gestioná tu perfil, tu agenda y tus consultas."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard
          title="Mi perfil público"
          description="Completá tu bio, especialidades, foto y precio de consulta."
          to="/perfil"
        />
        <SectionCard
          title="Mi agenda"
          description="Configurá tus días y horarios disponibles para recibir turnos."
          to="/profesional/agenda"
        />
        <SectionCard
          title="Mis consultas"
          description="Los turnos que reservaron tus pacientes, próximos y pasados."
          to="/mis-turnos"
        />
      </div>
    </DashboardLayout>
  );
}
