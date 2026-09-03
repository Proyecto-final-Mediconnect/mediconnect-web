import { Link } from 'react-router-dom';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf, formatLongDate } from '../features/appointments/lib/myAppointments';
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
  nextAppointment,
  professionalTasks,
  upcomingCount,
  withinNextWeek,
} from '../features/dashboard/lib/dashboard';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useMySchedule } from '../features/schedule/hooks/useSchedule';
import { buildWeekPreview, countSlots, mondayOf, todayLocal } from '../features/schedule/lib/generateSlots';
import { DashboardLayout } from './DashboardLayout';

/**
 * Panel del profesional (ENG-44).
 *
 * El panel del profesional tiene una pregunta propia que el del paciente no
 * tiene: **¿estoy en condiciones de recibir turnos?** Son tres condiciones del
 * backend —matrícula validada, precio publicado y agenda cargada— y hasta ahora
 * ninguna de las tres se veía en pantalla: el profesional con la matrícula
 * pendiente no tenía forma de enterarse de que su perfil no aparecía en el
 * catálogo. Ahora es lo primero que se lee.
 *
 * Después vienen la próxima consulta y la carga de la semana, que es lo que se
 * mira todos los días.
 */
export function ProfessionalDashboardPage() {
  const { user } = useSession();
  const perfil = useMyProfile();
  const agenda = useMySchedule();
  const turnos = useMyAppointments();

  const lista = turnos.data ?? [];
  const proximo = nextAppointment(lista);
  const estaSemana = withinNextWeek(lista);
  const tareas = professionalTasks(perfil.data, agenda.data);

  // Turnos que genera la agenda en la semana en curso: la oferta, contra las
  // consultas ya reservadas, que son la demanda. Se calcula igual que la vista
  // previa de la agenda, con las mismas funciones puras.
  const turnosQuePublica = agenda.data
    ? countSlots(
        buildWeekPreview(agenda.data.rules, agenda.data.blocks, mondayOf(todayLocal())),
      )
    : 0;

  const saludo = user?.firstName ? `Buen día, ${user.firstName}.` : 'Buen día.';

  return (
    <DashboardLayout
      barTitle="Panel"
      greeting={saludo}
      subtitle="Tu consultorio: perfil, agenda y consultas."
    >
      <div className="grid gap-9">
        {tareas.length > 0 && (
          <PanelSection numero="01" titulo="Antes de recibir turnos">
            <PendingTaskList tasks={tareas} />
          </PanelSection>
        )}

        <PanelSection
          numero={tareas.length > 0 ? '02' : '01'}
          titulo="Tu próxima consulta"
        >
          {turnos.isPending ? (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              Cargando tus consultas…
            </p>
          ) : proximo ? (
            <NextAppointmentCard
              appointment={proximo}
              counterpartLabel="Paciente"
              counterpartName={(() => {
                const c = counterpartOf(proximo, user?.id ?? null);
                return c ? `${c.firstName} ${c.lastName}` : null;
              })()}
            />
          ) : (
            <NoNextAppointment
              titulo="No tenés consultas agendadas."
              detalle="Los turnos aparecen acá en cuanto un paciente reserva. Revisá que tu agenda tenga horarios publicados para las próximas semanas."
              accion={{ to: '/profesional/agenda', label: 'Ver mi agenda' }}
            />
          )}
        </PanelSection>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            valor={estaSemana.length}
            etiqueta="Consultas esta semana"
            to="/mis-turnos"
          />
          <StatTile valor={upcomingCount(lista)} etiqueta="Turnos próximos" to="/mis-turnos" />
          {/* "Que publicás" y no "próximos": esto es la oferta que genera la
              agenda, no los turnos que ya reservaron. */}
          <StatTile
            valor={turnosQuePublica}
            etiqueta="Turnos que publicás"
            to="/profesional/agenda"
          />
        </div>

        {estaSemana.length > 0 && (
          <PanelSection
            numero={tareas.length > 0 ? '03' : '02'}
            titulo="Los próximos siete días"
          >
            <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
              {estaSemana.map((turno) => {
                const paciente = counterpartOf(turno, user?.id ?? null);

                return (
                  <li key={turno.id}>
                    {/* La fila entera es el acceso a la ficha: es lo que un
                        profesional quiere abrir antes de atender. */}
                    <Link
                      to={paciente ? `/pacientes/${paciente.id}/ficha` : '/mis-turnos'}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <span className="text-sm font-bold text-brand-deep">
                        {formatLongDate(turno.date)} · {turno.startTime}
                      </span>
                      <span className="text-sm text-muted">
                        {paciente
                          ? `${paciente.firstName} ${paciente.lastName}`
                          : 'Paciente no disponible'}
                        {' · '}
                        {turno.durationMinutes} min
                        <span aria-hidden="true" className="ml-2.5 text-brand-hover">
                          →
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </PanelSection>
        )}

        <PanelSection
          numero={String((tareas.length > 0 ? 3 : 2) + (estaSemana.length > 0 ? 1 : 0)).padStart(2, '0')}
          titulo="Tu consultorio"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <QuickLink
              title="Mi perfil público"
              description="Bio, especialidades, foto y precio de consulta."
              to="/perfil"
            />
            <QuickLink
              title="Mi agenda"
              description="Los días y horarios en los que atendés, y tus bloqueos."
              to="/profesional/agenda"
            />
            <QuickLink
              title="Mis consultas"
              description="Los turnos que reservaron tus pacientes."
              to="/mis-turnos"
            />
          </div>
        </PanelSection>
      </div>
    </DashboardLayout>
  );
}
