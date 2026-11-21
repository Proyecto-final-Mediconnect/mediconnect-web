import { Link } from 'react-router-dom';
import { ActivitySection } from '../features/activity/components/ActivitySection';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf } from '../features/appointments/lib/myAppointments';
import { formatDate } from '../features/appointments/lib/weeks';
import type { AppointmentParty } from '../features/appointments/types/appointment';
import { useSession } from '../features/auth/hooks/useSession';
import {
  DashboardSection,
  IconTile,
  NextAppointmentCard,
  NoNextAppointment,
  PendingTaskList,
} from '../features/dashboard/components/PanelPieces';
import { UpcomingAppointments } from '../features/dashboard/components/UpcomingAppointments';
import {
  currentOrNextAppointment,
  nextPhrase,
  professionalTasks,
  recentCounterparts,
  upcomingAgenda,
} from '../features/dashboard/lib/dashboard';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useMySchedule } from '../features/schedule/hooks/useSchedule';
import { useNow } from '../shared/hooks/useNow';
import { DashboardLayout } from './DashboardLayout';

const fullName = (p: AppointmentParty) => `${p.firstName} ${p.lastName}`;
const clinicalRecordOf = (p: AppointmentParty) => `/pacientes/${p.id}/historia-clinica`;

/**
 * Panel del profesional (ENG-44, rediseñado con la misma estructura que el del
 * paciente).
 *
 * Primero, si hace falta, **¿estoy en condiciones de recibir turnos?**: matrícula
 * validada, precio publicado y agenda cargada son condiciones del backend, y sin
 * ellas el profesional no aparece en el catálogo o no se le puede reservar.
 *
 * Después, lo que se mira todos los días: la consulta en curso o la próxima
 * (con la historia clínica a un clic, que es lo que se abre antes de atender) y,
 * debajo, los próximos turnos (ENG-207): el resumen de hoy, mañana y la semana,
 * los turnos por día y los que esperan que el paciente elija. Después, "Mi
 * actividad" (ENG-196) y los pacientes recientes. "Mi actividad": consultas, tasas de
 * cancelación y ausentismo, calificación y pacientes del período, con datos del
 * backend. Reemplaza a la vieja tarjeta "Tu semana", que contaba en el navegador
 * lo mismo que ya muestra la lista de los próximos siete días y un "Publicados"
 * (la oferta de la agenda) que se entendía mal. En la columna lateral, el
 * consultorio. El profesional no paga: la tarjeta no le ofrece el pago aunque
 * el turno esté sin pagar.
 */
export function ProfessionalDashboardPage() {
  const { user } = useSession();
  const perfil = useMyProfile();
  const agenda = useMySchedule();
  const turnos = useMyAppointments();
  const now = useNow();

  const lista = turnos.data ?? [];
  const proximo = currentOrNextAppointment(lista, now);
  const pacienteProximo = proximo ? counterpartOf(proximo, user?.id ?? null) : null;
  const agendaProxima = upcomingAgenda(lista, now, proximo?.id ?? null);
  const hayProximos =
    agendaProxima.counts.week > 0 ||
    agendaProxima.later > 0 ||
    agendaProxima.awaitingPatient.length > 0;
  const recientes = recentCounterparts(lista, now, (a) => a.patient);
  const tareas = professionalTasks(perfil.data, agenda.data);

  const saludo = user?.firstName ? `Buen día, ${user.firstName}.` : 'Buen día.';
  // El precio se resuelve en el perfil; la matrícula no (la valida el
  // equipo a mano), pero el perfil muestra su estado. Por eso el detalle dice qué
  // falta en vez de un "te falta algo" que mande a buscar.
  const faltaPrecio = tareas.some((t) => t.id === 'precio');
  const matricula = tareas.find((t) => t.id === 'matricula');
  const detallePerfil = faltaPrecio
    ? 'Te falta publicar tu precio de consulta.'
    : matricula
      ? `${matricula.title}.`
      : 'Bio, especialidades, foto y precio.';

  return (
    <DashboardLayout
      barTitle="Panel"
      greeting={saludo}
      subtitle={
        turnos.isPending
          ? ' '
          : nextPhrase(proximo, pacienteProximo ? fullName(pacienteProximo) : null, now)
      }
    >
      <div className="grid gap-8">
        {tareas.length > 0 && <PendingTaskList tasks={tareas} />}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid min-w-0 gap-8">
            <DashboardSection
              title={
                proximo && Date.parse(proximo.scheduledAt) <= now.getTime()
                  ? 'Tu consulta en curso'
                  : 'Tu próxima consulta'
              }
            >
              {turnos.isPending ? (
                <p role="status" aria-live="polite" className="text-sm text-muted">
                  Cargando tus consultas…
                </p>
              ) : proximo ? (
                <NextAppointmentCard
                  appointment={proximo}
                  counterpartLabel="Paciente"
                  counterpartName={pacienteProximo ? fullName(pacienteProximo) : null}
                  primaryAction={
                    pacienteProximo
                      ? { to: clinicalRecordOf(pacienteProximo), label: 'Ver historia clínica' }
                      : undefined
                  }
                />
              ) : (
                <NoNextAppointment
                  titulo="Todavía no te reservaron turnos."
                  detalle="Aparecen acá en cuanto un paciente reserva. Para que te encuentren, revisá que tu agenda tenga horarios y tu perfil esté completo."
                  accion={{ to: '/profesional/agenda', label: 'Ver mi agenda' }}
                  secundaria={{ to: '/perfil', label: 'Ver mi perfil público' }}
                />
              )}
            </DashboardSection>

            {/* Pegado a la tarjeta: es el resto del día y de la semana. La lista
                se corta en unos pocos turnos para no empujar "Mi actividad"
                fuera de la pantalla. */}
            {!turnos.isPending && hayProximos && (
              <DashboardSection
                title="Próximos turnos"
                action={
                  <Link
                    to="/mis-turnos"
                    className="text-sm font-semibold text-brand-hover hover:underline"
                  >
                    Ver todos
                  </Link>
                }
              >
                <UpcomingAppointments
                  agenda={agendaProxima}
                  userId={user?.id ?? null}
                  hasNext={proximo !== null}
                />
              </DashboardSection>
            )}

            <ActivitySection />

            <div className="grid items-start gap-8 2xl:grid-cols-2">
              {recientes.length > 0 && (
                <DashboardSection
                  title="Pacientes recientes"
                  action={
                    <Link
                      to="/profesional/pacientes"
                      className="text-sm font-semibold text-brand-hover hover:underline"
                    >
                      Ver todos
                    </Link>
                  }
                >
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                    {recientes.map(({ party: patient, lastDate }) => (
                      <li
                        key={patient.id}
                        className="grid gap-3 rounded-[14px] border border-line bg-white p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex size-11 flex-none items-center justify-center rounded-full bg-surface-teal text-sm font-bold text-brand-deep"
                          >
                            {patient.firstName.charAt(0)}
                            {patient.lastName.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-bold text-brand-deep">
                              {fullName(patient)}
                            </span>
                            <span className="block text-xs text-muted">
                              Última consulta: {formatDate(lastDate)}
                            </span>
                          </span>
                        </div>
                        <Link
                          to={clinicalRecordOf(patient)}
                          className="inline-flex items-center justify-center rounded-[9px] border border-line-strong px-3 py-2 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          aria-label={`Historia clínica de ${fullName(patient)}`}
                        >
                          Historia clínica
                        </Link>
                      </li>
                    ))}
                  </ul>
                </DashboardSection>
              )}
            </div>
          </div>

          <aside className="grid gap-8 lg:sticky lg:top-24">
            <DashboardSection title="Tu consultorio">
              <div className="grid gap-3">
                <IconTile
                  to="/profesional/agenda"
                  title="Mi agenda"
                  detail="Horarios de atención y bloqueos."
                  icon="calendar"
                  warn={tareas.some((t) => t.id === 'agenda')}
                />
                <IconTile
                  to="/perfil"
                  title="Mi perfil público"
                  detail={detallePerfil}
                  icon="user"
                  warn={faltaPrecio || matricula !== undefined}
                />
                <IconTile
                  to="/profesional/resenas"
                  title="Reseñas"
                  detail="Lo que opinan tus pacientes."
                  icon="star"
                />
              </div>
            </DashboardSection>

            <Link
              to="/mis-turnos"
              className="grid gap-1 rounded-[14px] bg-brand-deep p-5 text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <span className="text-[15px] font-bold">Mis turnos</span>
              <span className="text-sm text-on-night">
                Todos los turnos que reservaron tus pacientes. →
              </span>
            </Link>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
