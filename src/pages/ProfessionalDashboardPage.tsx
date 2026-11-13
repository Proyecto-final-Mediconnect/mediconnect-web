import { Link } from 'react-router-dom';
import { DateBadge } from '../features/appointments/components/agenda/DateBadge';
import { StatusChip } from '../features/appointments/components/agenda/StatusChip';
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
import {
  nextAppointment,
  nextPhrase,
  professionalTasks,
  recentCounterparts,
  upcomingCount,
  withinNextWeek,
} from '../features/dashboard/lib/dashboard';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useMySchedule } from '../features/schedule/hooks/useSchedule';
import {
  buildWeekPreview,
  countSlots,
  mondayOf,
  todayLocal,
} from '../features/schedule/lib/generateSlots';
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
 * Después, lo que se mira todos los días: la próxima consulta (con la historia
 * clínica a un clic, que es lo que se abre antes de atender), la semana y los
 * pacientes recientes. En la columna lateral, los números de la semana y el
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
  const proximo = nextAppointment(lista, now);
  const pacienteProximo = proximo ? counterpartOf(proximo, user?.id ?? null) : null;
  const estaSemana = withinNextWeek(lista, now).sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  );
  const recientes = recentCounterparts(lista, now, (a) => a.patient);
  const tareas = professionalTasks(perfil.data, agenda.data);

  // Turnos que genera la agenda en la semana en curso: la oferta, contra las
  // consultas ya reservadas, que son la demanda. Se calcula igual que la vista
  // previa de la agenda, con las mismas funciones puras.
  const turnosQuePublica = agenda.data
    ? countSlots(buildWeekPreview(agenda.data.rules, agenda.data.blocks, mondayOf(todayLocal())))
    : 0;

  const saludo = user?.firstName ? `Buen día, ${user.firstName}.` : 'Buen día.';
  // El precio se resuelve en el perfil; la matrícula no (la valida un
  // moderador), pero el perfil muestra su estado. Por eso el detalle dice qué
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
          : nextPhrase(proximo, pacienteProximo ? fullName(pacienteProximo) : null)
      }
    >
      <div className="grid gap-8">
        {tareas.length > 0 && <PendingTaskList tasks={tareas} />}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid min-w-0 gap-8">
            <DashboardSection title="Tu próxima consulta">
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

            <div className="grid items-start gap-8 2xl:grid-cols-2">
              {estaSemana.length > 0 && (
                <DashboardSection
                  title="Los próximos siete días"
                  action={
                    <Link
                      to="/mis-turnos"
                      className="text-sm font-semibold text-brand-hover hover:underline"
                    >
                      Ver todos
                    </Link>
                  }
                >
                  <ul className="divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white">
                    {estaSemana.map((turno) => {
                      const paciente = counterpartOf(turno, user?.id ?? null);
                      return (
                        <li key={turno.id}>
                          {/* La fila entera abre la historia clínica: es lo que
                              un profesional quiere ver antes de atender. */}
                          <Link
                            to={paciente ? clinicalRecordOf(paciente) : `/turnos/${turno.id}`}
                            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
                          >
                            <DateBadge date={turno.date} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-semibold text-brand-deep">
                                {paciente ? fullName(paciente) : 'Paciente no disponible'}
                              </span>
                              <span className="block text-sm text-muted">
                                {turno.startTime} · {turno.durationMinutes} min
                              </span>
                            </span>
                            <StatusChip status={turno.status} />
                            <span aria-hidden="true" className="text-muted-soft">
                              ›
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </DashboardSection>
              )}

              {recientes.length > 0 && (
                <DashboardSection title="Pacientes recientes">
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
            <DashboardSection title="Tu semana">
              <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[14px] border border-line bg-white">
                <WeekStat valor={estaSemana.length} etiqueta="Consultas" to="/mis-turnos" />
                <WeekStat valor={upcomingCount(lista, now)} etiqueta="Próximos" to="/mis-turnos" />
                {/* "Publicados" y no "libres": es la oferta que genera la
                    agenda, no lo que queda sin reservar. */}
                <WeekStat valor={turnosQuePublica} etiqueta="Publicados" to="/profesional/agenda" />
              </div>
            </DashboardSection>

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
              <span className="text-[15px] font-bold">Mis consultas</span>
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

/** Un número de la semana. Los dígitos van en Newsreader, como el resto de las
 *  cifras grandes del sistema; en gris cuando son cero. */
function WeekStat({ valor, etiqueta, to }: { valor: number; etiqueta: string; to: string }) {
  return (
    <Link
      to={to}
      className="block p-4 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
    >
      <span
        className={`font-display block text-[32px] leading-none tabular-nums ${
          valor === 0 ? 'text-muted' : 'text-brand-deep'
        }`}
      >
        {valor}
      </span>
      <span className="mt-2 block text-xs text-muted">{etiqueta}</span>
    </Link>
  );
}
