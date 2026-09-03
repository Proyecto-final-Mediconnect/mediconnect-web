import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf } from '../features/appointments/lib/myAppointments';
import { useSession } from '../features/auth/hooks/useSession';
import {
  NextAppointmentCard,
  NoNextAppointment,
  PanelSection,
  PendingTaskList,
  QuickLink,
  StatTile,
} from '../features/dashboard/components/PanelPieces';
import {
  completedCount,
  nextAppointment,
  patientTasks,
  upcomingCount,
} from '../features/dashboard/lib/dashboard';
import { useMyProfile } from '../features/patient-profile/hooks/usePatientProfile';
import { DashboardLayout } from './DashboardLayout';

/**
 * Panel del paciente (ENG-44).
 *
 * Dejó de ser una grilla de accesos directos. Ese menú ya lo da la barra
 * lateral; repetirlo acá gastaba la pantalla entera en decir dos veces lo mismo.
 * Ahora el panel responde tres preguntas en orden: **qué me falta**, **cuál es
 * mi próximo turno** y **cómo vengo**.
 *
 * El perfil incompleto va arriba de todo porque no es un consejo: hasta que se
 * guarda, `POST /appointments` responde 409 y reservar es imposible. Antes eso
 * estaba escondido en una tarjeta igual a las demás.
 */
export function PatientDashboardPage() {
  const { user } = useSession();
  const perfil = useMyProfile();
  const turnos = useMyAppointments();

  const lista = turnos.data ?? [];
  const proximo = nextAppointment(lista);
  const tareas = patientTasks(perfil.data);

  const saludo = user?.firstName ? `Hola, ${user.firstName}.` : 'Hola.';

  return (
    <DashboardLayout
      barTitle="Panel"
      greeting={saludo}
      subtitle="Este es tu espacio en MediConnect."
    >
      <div className="grid gap-9">
        {tareas.length > 0 && (
          <PanelSection numero="01" titulo="Para empezar">
            <PendingTaskList tasks={tareas} />
          </PanelSection>
        )}

        <PanelSection
          numero={tareas.length > 0 ? '02' : '01'}
          titulo="Tu próxima consulta"
        >
          {turnos.isPending ? (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              Cargando tus turnos…
            </p>
          ) : proximo ? (
            <NextAppointmentCard
              appointment={proximo}
              counterpartLabel="Profesional"
              counterpartName={(() => {
                const c = counterpartOf(proximo, user?.id ?? null);
                return c ? `${c.firstName} ${c.lastName}` : null;
              })()}
            />
          ) : (
            <NoNextAppointment
              titulo="No tenés turnos agendados."
              detalle="Buscá un profesional por especialidad, mirá su disponibilidad y reservá en el horario que te sirva."
              accion={{ to: '/profesionales', label: 'Buscar profesionales' }}
            />
          )}
        </PanelSection>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            valor={upcomingCount(lista)}
            etiqueta="Turnos próximos"
            to="/mis-turnos"
          />
          <StatTile valor={completedCount(lista)} etiqueta="Consultas hechas" />
          {/* Texto y no un número: "—" no decía nada, y el perfil no se cuenta. */}
          <StatTile
            valor={perfil.data?.completed ? 'Listo' : 'Falta'}
            etiqueta="Mi perfil"
            to="/perfil/paciente"
          />
        </div>

        <PanelSection numero={tareas.length > 0 ? '03' : '02'} titulo="Tu cuenta">
          <div className="grid gap-3 md:grid-cols-2">
            <QuickLink
              title="Buscar profesionales"
              description="El catálogo de especialistas con matrícula verificada."
              to="/profesionales"
            />
            <QuickLink
              title="Mis turnos"
              description="Tus consultas agendadas, su estado y las que ya pasaron."
              to="/mis-turnos"
            />
            <QuickLink
              title="Mi perfil"
              description="Tus datos personales y de contacto."
              to="/perfil/paciente"
            />
            <QuickLink
              title="Mi historia clínica"
              description="Todo lo que registraron tus profesionales, en orden."
              to="/historia"
            />
          </div>
        </PanelSection>
      </div>
    </DashboardLayout>
  );
}
