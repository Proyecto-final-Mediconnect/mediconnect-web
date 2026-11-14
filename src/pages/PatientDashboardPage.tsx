import { Link } from 'react-router-dom';
import { DateBadge } from '../features/appointments/components/agenda/DateBadge';
import { StatusChip } from '../features/appointments/components/agenda/StatusChip';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf, isActive } from '../features/appointments/lib/myAppointments';
import { formatDate } from '../features/appointments/lib/weeks';
import { useSession } from '../features/auth/hooks/useSession';
import {
  DashboardSection as Section,
  IconTile as HealthTile,
  NextAppointmentCard,
  NoNextAppointment,
  PendingTaskList,
} from '../features/dashboard/components/PanelPieces';
import {
  nextAppointment,
  nextPhrase,
  patientTasks,
  recentCounterparts,
} from '../features/dashboard/lib/dashboard';
import { useMyMediPassHistory } from '../features/medipass/hooks/useMediPass';
import { relativeTime } from '../features/notifications/lib/relativeTime';
import { useMyProfile } from '../features/patient-profile/hooks/usePatientProfile';
import { PendingReviewCards } from '../features/reviews/components/PendingReviewCards';
import { useNow } from '../shared/hooks/useNow';
import { PatientSummaryTiles } from '../features/patient-summary/PatientSummaryTiles';
import { DashboardLayout } from './DashboardLayout';

/**
 * Panel del paciente (ENG-44, rediseñado en ENG-178 como el inicio de la app).
 *
 * Responde, en orden: qué me falta (el perfil, que bloquea reservar), cuál es mi
 * próxima consulta y qué viene después, con quién puedo volver a consultar, y a
 * un clic lo de mi salud (MediPass, historia clínica, perfil). En pantalla ancha
 * la salud va en una columna al costado en vez de una grilla que repetía el
 * menú lateral.
 */
export function PatientDashboardPage() {
  const { user } = useSession();
  const perfil = useMyProfile();
  const turnos = useMyAppointments();
  const now = useNow();

  const lista = turnos.data ?? [];
  const proximo = nextAppointment(lista, now);
  const despues = lista
    .filter((a) => isActive(a) && Date.parse(a.scheduledAt) > now.getTime() && a.id !== proximo?.id)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    .slice(0, 3);
  const volver = recentCounterparts(lista, now, (a) => a.professional);
  const recientes = lista
    .filter((a) => !isActive(a) || Date.parse(a.scheduledAt) <= now.getTime())
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
    .slice(0, 4);
  const tareas = patientTasks(perfil.data);
  const saludo = user?.firstName ? `Hola, ${user.firstName}.` : 'Hola.';

  return (
    <DashboardLayout
      barTitle="Panel"
      greeting={saludo}
      subtitle={turnos.isPending ? ' ' : nextPhrase(proximo)}
    >
      <div className="grid gap-8">
        {tareas.length > 0 && <PendingTaskList tasks={tareas} />}
        <PendingReviewCards />
        <PatientSummaryTiles />

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid min-w-0 gap-8">
            <Section title="Tu próxima consulta">
              {turnos.isPending ? (
                <p role="status" aria-live="polite" className="text-sm text-muted">
                  Cargando tus turnos…
                </p>
              ) : proximo ? (
                <NextAppointmentCard
                  appointment={proximo}
                  counterpartLabel="Profesional"
                  canPay
                  counterpartName={(() => {
                    const c = counterpartOf(proximo, user?.id ?? null);
                    return c ? `${c.firstName} ${c.lastName}` : null;
                  })()}
                />
              ) : (
                <NoNextAppointment
                  titulo="No tenés turnos agendados."
                  detalle="Buscá un profesional por especialidad, mirá su disponibilidad y reservá en el horario que te sirva."
                  accion={{ to: '/buscar', label: 'Buscar profesionales' }}
                />
              )}
            </Section>

            {despues.length > 0 && (
              <Section
                title="Después"
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
                  {despues.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`/turnos/${a.id}`}
                        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
                      >
                        <DateBadge date={a.date} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-brand-deep">
                            {a.professional
                              ? `${a.professional.firstName} ${a.professional.lastName}`
                              : 'Profesional'}
                          </span>
                          <span className="block text-sm text-muted">
                            {a.startTime} · {a.durationMinutes} min · Videoconsulta
                          </span>
                        </span>
                        <StatusChip status={a.status} />
                        <span aria-hidden="true" className="text-muted-soft">
                          ›
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="grid items-start gap-8 2xl:grid-cols-2">
              {volver.length > 0 && (
                <Section title="Volver a consultar">
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                    {volver.map(({ party: professional, lastDate }) => (
                      <li
                        key={professional.id}
                        className="grid gap-3 rounded-[14px] border border-line bg-white p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex size-11 flex-none items-center justify-center rounded-full bg-surface-teal text-sm font-bold text-brand-deep"
                          >
                            {professional.firstName.charAt(0)}
                            {professional.lastName.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-bold text-brand-deep">
                              {professional.firstName} {professional.lastName}
                            </span>
                            <span className="block text-xs text-muted">
                              Última consulta: {formatDate(lastDate)}
                            </span>
                          </span>
                        </div>
                        <Link
                          to={`/profesionales/${professional.id}/turnos`}
                          className="inline-flex items-center justify-center rounded-[9px] border border-line-strong px-3 py-2 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          aria-label={`Reservar con ${professional.firstName} ${professional.lastName}`}
                        >
                          Reservar
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {recientes.length > 0 && (
                <Section
                  title="Actividad reciente"
                  action={
                    <Link
                      to="/mis-turnos"
                      className="text-sm font-semibold text-brand-hover hover:underline"
                    >
                      Ver historial
                    </Link>
                  }
                >
                  <ul className="divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white">
                    {recientes.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={`/turnos/${a.id}`}
                          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
                        >
                          <DateBadge date={a.date} muted />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold text-ink">
                              {a.professional
                                ? `${a.professional.firstName} ${a.professional.lastName}`
                                : 'Profesional'}
                            </span>
                            <span className="block text-sm text-muted-soft">
                              {formatDate(a.date)} · {a.startTime}
                            </span>
                          </span>
                          <StatusChip status={a.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </div>

          <aside className="grid gap-8 lg:sticky lg:top-24">
            <Section title="Tu salud">
              <div className="grid gap-3">
                <HealthTile
                  to="/medipass"
                  title="MediPass"
                  detail="Tu código para que te atiendan en una emergencia."
                  icon="qr"
                />
                <HealthTile
                  to="/mi-historia-clinica"
                  title="Historia clínica"
                  detail="Todo lo que registraron tus profesionales."
                  icon="doc"
                />
                <HealthTile
                  to="/perfil/paciente"
                  title="Mi perfil"
                  detail={
                    perfil.data?.completed
                      ? 'Tus datos están completos.'
                      : 'Te faltan datos para poder reservar.'
                  }
                  icon="user"
                  warn={perfil.data !== undefined && !perfil.data.completed}
                />
              </div>
            </Section>

            <MediPassAccesses now={now} />

            <Link
              to="/buscar"
              className="grid gap-1 rounded-[14px] bg-brand-deep p-5 text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <span className="text-[15px] font-bold">Buscar profesionales</span>
              <span className="text-sm text-on-night">
                Por especialidad, precio y disponibilidad. →
              </span>
            </Link>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * Quién abrió el MediPass por última vez (ENG-76). En el panel porque es lo que
 * el paciente quiere saber de un vistazo: si alguien entró a su ficha y cuándo.
 * Si no se puede leer, no se muestra: no es lo principal de la pantalla.
 */
function MediPassAccesses({ now }: { now: Date }) {
  const historial = useMyMediPassHistory(1);
  if (historial.isError || historial.isPending) return null;

  const ultimo = historial.data.accesos[0];
  const abierto = ultimo?.estado === 'ACTIVO';

  return (
    <Section
      title="Accesos a tu MediPass"
      action={
        <Link to="/medipass" className="text-sm font-semibold text-brand-hover hover:underline">
          Ver todos
        </Link>
      }
    >
      <div className="rounded-[14px] border border-line bg-white p-4">
        {ultimo ? (
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 flex-none rounded-full ${abierto ? 'bg-brand' : 'bg-muted-soft'}`}
            />
            <p className="text-sm text-ink">
              <span className="font-semibold">{ultimo.consultante.nombre ?? 'Alguien'}</span>
              {ultimo.consultante.matricula && (
                <span className="text-muted"> · {ultimo.consultante.matricula}</span>
              )}
              <span className="block text-muted">
                {abierto ? 'Lo está mirando ahora · ' : 'Lo abrió '}
                {relativeTime(now, ultimo.inicio)}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Nadie abrió tu MediPass todavía.</p>
        )}
      </div>
    </Section>
  );
}
