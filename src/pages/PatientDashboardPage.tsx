import { Link } from 'react-router-dom';
import { DateBadge } from '../features/appointments/components/agenda/DateBadge';
import { StatusChip } from '../features/appointments/components/agenda/StatusChip';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf, isActive } from '../features/appointments/lib/myAppointments';
import { formatDate } from '../features/appointments/lib/weeks';
import type { Appointment, AppointmentParty } from '../features/appointments/types/appointment';
import { useSession } from '../features/auth/hooks/useSession';
import {
  NextAppointmentCard,
  NoNextAppointment,
  PendingTaskList,
} from '../features/dashboard/components/PanelPieces';
import { nextAppointment, patientTasks } from '../features/dashboard/lib/dashboard';
import { useMyMediPassHistory } from '../features/medipass/hooks/useMediPass';
import { relativeTime } from '../features/notifications/lib/relativeTime';
import { useMyProfile } from '../features/patient-profile/hooks/usePatientProfile';
import { useNow } from '../shared/hooks/useNow';
import { DashboardLayout } from './DashboardLayout';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "Tu próxima consulta es el lunes 27 de octubre a las 10:00", como en la app. */
function nextPhrase(appointment: Appointment | null): string {
  if (!appointment) return 'No tenés consultas agendadas.';
  const [y, m, d] = appointment.date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `Tu próxima consulta es el ${weekday} ${formatDate(appointment.date)} a las ${appointment.startTime}.`;
}

/** Profesionales con los que ya hubo una consulta, del más reciente al más viejo, sin repetir. */
function pastProfessionals(
  appointments: Appointment[],
  now: Date,
): { professional: AppointmentParty; lastDate: string }[] {
  const seen = new Map<string, { professional: AppointmentParty; lastDate: string }>();
  [...appointments]
    .filter((a) => a.status === 'COMPLETADO' && Date.parse(a.scheduledAt) < now.getTime())
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
    .forEach((a) => {
      if (a.professional && !seen.has(a.professional.id)) {
        seen.set(a.professional.id, { professional: a.professional, lastDate: a.date });
      }
    });
  return [...seen.values()].slice(0, 3);
}

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
  const volver = pastProfessionals(lista, now);
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
                    {volver.map(({ professional, lastDate }) => (
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

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const ICONS = {
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0',
} as const;

function HealthTile({
  to,
  title,
  detail,
  icon,
  warn = false,
}: {
  to: string;
  title: string;
  detail: string;
  icon: keyof typeof ICONS;
  warn?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-[14px] border border-line bg-white p-4 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span
        aria-hidden="true"
        className={`flex size-11 flex-none items-center justify-center rounded-[12px] ${
          warn ? 'bg-tag-warm text-tag-warm-ink' : 'bg-surface-teal text-brand-deep'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-brand-deep">{title}</span>
        <span className={`block text-sm ${warn ? 'text-tag-warm-ink' : 'text-muted'}`}>
          {detail}
        </span>
      </span>
      <span aria-hidden="true" className="text-muted-soft">
        ›
      </span>
    </Link>
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
