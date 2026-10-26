import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMediaQuery, WIDE_QUERY } from '../../../shared/hooks/useMediaQuery';
import { useNow } from '../../../shared/hooks/useNow';
import { useSession } from '../../auth/hooks/useSession';
import { canPay } from '../../payments/lib/checkout';
import { joinStateOf, timeUntilOpen } from '../../video/lib/joinWindow';
import { useMyAppointments } from '../hooks/useAppointments';
import {
  agendaSections,
  EMPTY_AGENDA_FILTERS,
  filterAgenda,
  type AgendaFilters,
} from '../lib/agenda';
import { canCancel, counterpartOf, formatLongDate, isActive } from '../lib/myAppointments';
import { formatPrice } from '../lib/weeks';
import type { Appointment } from '../types/appointment';
import { AppointmentDetail } from './AppointmentDetail';
import { AgendaToolbar } from './agenda/AgendaToolbar';
import { CancelAppointmentDialog } from './agenda/CancelAppointmentDialog';
import { DateBadge } from './agenda/DateBadge';
import { RefundOutcomeBanner } from './agenda/RefundOutcomeBanner';
import { StatusChip } from './agenda/StatusChip';

/**
 * Mis turnos (ENG-55, rediseñada en ENG-178 como en la app).
 *
 * Una sola lista: el próximo turno destacado, después los demás próximos en
 * tarjetas con su acción principal, y bajando, la historia agrupada por mes en
 * filas compactas. Cada turno abre su detalle (`/turnos/:id`), donde están todas
 * las acciones y la línea de tiempo.
 *
 * Sirve a los dos roles: `GET /appointments/me` devuelve, vía RLS, los turnos
 * donde el usuario es el paciente o el profesional. Cambia de quién se muestra el
 * nombre y qué acciones aparecen.
 */
export function MyAppointments() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const appointments = useMyAppointments();
  const now = useNow();
  const wide = useMediaQuery(WIDE_QUERY);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<AgendaFilters>(EMPTY_AGENDA_FILTERS);
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const [refundOutcome, setRefundOutcome] = useState<string | null>(null);

  if (appointments.isPending) {
    return (
      <p role="status" aria-live="polite" className="text-muted">
        Cargando tus turnos…
      </p>
    );
  }

  if (appointments.isError) {
    return (
      <p role="alert" className="text-danger">
        {appointments.error.message}
      </p>
    );
  }

  const isPatient = user?.role === 'PACIENTE';
  const counterpart = (a: Appointment) => counterpartOf(a, userId);
  const visible = filterAgenda(appointments.data, filters, counterpart, now);
  const sections = agendaSections(visible, now);
  const upcoming = sections[0]?.kind === 'upcoming' ? sections[0] : null;
  const history = sections.filter((s) => s.kind === 'history');
  const [next, ...restUpcoming] = upcoming?.data ?? [];
  const filtering =
    filters.search.trim() !== '' || filters.period !== 'todos' || filters.status !== 'todos';

  // En pantalla ancha el detalle va al costado: el elegido, o el próximo turno
  // si todavía no se eligió ninguno. En angosta cada turno abre su pantalla.
  const selectedId = searchParams.get('turno') ?? next?.id ?? sections[0]?.data[0]?.id ?? null;
  const select = (id: string) => setSearchParams({ turno: id }, { replace: true });
  const listProps = { userId, now, wide, selectedId, onSelect: select, onCancel: setToCancel };

  const list = (
    <div className="grid min-w-0 content-start gap-6">
      {appointments.data.length > 0 && (
        <>
          <Summary appointments={appointments.data} now={now} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <AgendaToolbar
                filters={filters}
                onChange={setFilters}
                searchLabel={isPatient ? 'Buscar por profesional' : 'Buscar por paciente'}
              />
            </div>
            {isPatient && (
              <Link
                to="/buscar"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-deep px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <span aria-hidden="true">+</span> Nuevo turno
              </Link>
            )}
          </div>
        </>
      )}

      {sections.length === 0 &&
        (filtering ? (
          <Empty
            title="No hay turnos con esos filtros"
            description="Probá con otra fecha, otro estado u otro nombre."
            action={
              <button
                type="button"
                onClick={() => setFilters(EMPTY_AGENDA_FILTERS)}
                className="font-semibold text-brand-hover underline-offset-2 hover:underline"
              >
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <Empty
            title="Todavía no tenés turnos"
            description={
              isPatient
                ? 'Buscá un profesional y reservá el horario que te quede cómodo.'
                : 'Cuando un paciente reserve, el turno aparece acá.'
            }
            action={
              isPatient ? (
                <Link
                  to="/buscar"
                  className="font-semibold text-brand-hover underline-offset-2 hover:underline"
                >
                  Buscar profesional
                </Link>
              ) : null
            }
          />
        ))}

      {/* En angosta, el próximo turno va destacado arriba; en ancha ese lugar lo
          ocupa el detalle del costado, y el próximo es la primera tarjeta. */}
      {next && !wide && (
        <section aria-labelledby="proximo-turno" className="grid gap-3">
          <h2 id="proximo-turno" className="sr-only">
            Próximo turno
          </h2>
          <NextAppointment appointment={next} userId={userId} now={now} onCancel={setToCancel} />
        </section>
      )}

      {(wide ? (upcoming?.data ?? []) : restUpcoming).length > 0 && (
        <section aria-labelledby="proximos" className="grid gap-3">
          <SectionTitle id="proximos">Próximos</SectionTitle>
          <ul className="grid gap-3">
            {(wide ? (upcoming?.data ?? []) : restUpcoming).map((appointment) => (
              <li key={appointment.id}>
                <UpcomingCard appointment={appointment} {...listProps} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.map((section) => (
        <section key={section.key} aria-labelledby={`mes-${section.key}`} className="grid gap-3">
          <SectionTitle id={`mes-${section.key}`}>{section.title}</SectionTitle>
          <ul className="divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white">
            {section.data.map((appointment) => (
              <li key={appointment.id}>
                <HistoryRow appointment={appointment} {...listProps} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6">
      {refundOutcome && (
        <RefundOutcomeBanner text={refundOutcome} onClose={() => setRefundOutcome(null)} />
      )}

      {wide && appointments.data.length > 0 ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
          {list}
          <aside
            aria-label="Detalle del turno"
            className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[18px] bg-surface p-1"
          >
            {selectedId ? (
              <AppointmentDetail appointmentId={selectedId} variant="panel" />
            ) : (
              <p className="p-6 text-sm text-muted">Elegí un turno para ver el detalle.</p>
            )}
          </aside>
        </div>
      ) : (
        list
      )}

      <CancelAppointmentDialog
        appointment={toCancel}
        now={now}
        onClose={() => setToCancel(null)}
        onCancelled={setRefundOutcome}
      />
    </div>
  );
}

/** Un vistazo antes de la lista: cuántos vienen, cuántos falta pagar y cuántos se hicieron. */
function Summary({ appointments, now }: { appointments: Appointment[]; now: Date }) {
  const upcoming = appointments.filter(
    (a) => isActive(a) && Date.parse(a.scheduledAt) > now.getTime(),
  );
  const unpaid = upcoming.filter((a) => a.status === 'RESERVADO_SIN_PAGAR').length;
  const done = appointments.filter((a) => a.status === 'COMPLETADO').length;

  const items = [
    { value: upcoming.length, label: upcoming.length === 1 ? 'próximo' : 'próximos', warn: false },
    { value: unpaid, label: 'sin pagar', warn: unpaid > 0 },
    { value: done, label: done === 1 ? 'consulta hecha' : 'consultas hechas', warn: false },
  ];

  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex flex-col-reverse gap-1 rounded-[12px] border px-4 py-3 ${
            item.warn ? 'border-tag-warm-dot/40 bg-tag-warm' : 'border-line bg-white'
          }`}
        >
          <dt className={`text-xs font-semibold ${item.warn ? 'text-tag-warm-ink' : 'text-muted'}`}>
            {item.label}
          </dt>
          <dd
            className={`font-display text-[28px] leading-none ${
              item.warn ? 'text-tag-warm-ink' : 'text-brand-deep'
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Props comunes de las tarjetas y filas: a dónde lleva tocarlas y cuál está elegida. */
interface ListItemProps {
  appointment: Appointment;
  userId: string | null;
  now: Date;
  wide: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCancel: (a: Appointment) => void;
}

/** En ancha, elegir el turno lo muestra al costado; en angosta abre su pantalla. */
function OpenLink({
  appointment,
  wide,
  selected,
  onSelect,
  label,
  className,
  children,
}: {
  appointment: Appointment;
  wide: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={wide ? `?turno=${appointment.id}` : `/turnos/${appointment.id}`}
      onClick={(e) => {
        if (!wide) return;
        e.preventDefault();
        onSelect(appointment.id);
      }}
      aria-label={label}
      aria-current={wide && selected ? 'true' : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </h2>
  );
}

function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[14px] border border-dashed border-line-strong bg-white px-6 py-12 text-center">
      <p className="text-[17px] font-bold text-brand-deep">{title}</p>
      <p className="max-w-[46ch] text-sm text-muted">{description}</p>
      {action && <div className="mt-2 text-sm">{action}</div>}
    </div>
  );
}

function personName(appointment: Appointment, userId: string | null): string {
  const person = counterpartOf(appointment, userId);
  if (person) return `${person.firstName} ${person.lastName}`;
  return appointment.patient?.id === userId
    ? 'Profesional no disponible'
    : 'Paciente no disponible';
}

/** La acción que importa ahora, si hay una: entrar a la sala o pagar. */
function PrimaryAction({
  appointment,
  userId,
  now,
  onDark = false,
}: {
  appointment: Appointment;
  userId: string | null;
  now: Date;
  onDark?: boolean;
}) {
  const join = joinStateOf(appointment, now);
  const isPatient = appointment.patient?.id === userId;
  const base =
    'inline-flex items-center justify-center rounded-[9px] px-4 py-2.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

  if (join.kind === 'OPEN') {
    return (
      <Link
        to={`/turnos/${appointment.id}/videoconsulta`}
        className={`${base} bg-brand text-ink-deep hover:bg-brand-bright`}
      >
        Entrar a la sala
      </Link>
    );
  }
  if (isPatient && canPay(appointment, now)) {
    return (
      <Link
        to={`/turnos/${appointment.id}/pago`}
        className={`${base} ${onDark ? 'bg-brand text-ink-deep hover:bg-brand-bright' : 'bg-brand-deep text-white hover:bg-night'}`}
      >
        Pagar
      </Link>
    );
  }
  return null;
}

function NextAppointment({
  appointment,
  userId,
  now,
  onCancel,
}: {
  appointment: Appointment;
  userId: string | null;
  now: Date;
  onCancel: (a: Appointment) => void;
}) {
  const join = joinStateOf(appointment, now);
  const soon =
    join.kind === 'TOO_EARLY' && join.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000;

  return (
    <article className="rounded-[16px] bg-night p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Próximo turno
        </p>
        <StatusChip status={appointment.status} onDark />
      </div>
      <p className="font-display mt-3 text-[26px] leading-[1.2]">
        {formatLongDate(appointment.date)} · {appointment.startTime}
      </p>
      <p className="mt-1.5 text-sm text-on-night">
        {personName(appointment, userId)} · Videoconsulta · {appointment.durationMinutes} min ·{' '}
        {formatPrice(appointment.price, appointment.currency)}
      </p>
      {soon && join.kind === 'TOO_EARLY' && (
        <p className="mt-3 text-sm text-on-night-strong">
          La sala se abre {timeUntilOpen(join.opensAt, now)}.
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryAction appointment={appointment} userId={userId} now={now} onDark />
        <Link
          to={`/turnos/${appointment.id}`}
          className="inline-flex items-center rounded-[9px] border border-white/25 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={`Ver el turno con ${personName(appointment, userId)}`}
        >
          Ver detalle
        </Link>
        {canCancel(appointment, userId, now) && (
          <button
            type="button"
            onClick={() => onCancel(appointment)}
            className="text-sm font-semibold text-on-night underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cancelar turno
          </button>
        )}
      </div>
    </article>
  );
}

function UpcomingCard({
  appointment,
  userId,
  now,
  wide,
  selectedId,
  onSelect,
  onCancel,
}: ListItemProps) {
  const name = personName(appointment, userId);
  const selected = wide && selectedId === appointment.id;

  return (
    <article
      className={`flex flex-wrap items-center gap-4 rounded-[14px] border bg-white p-4 transition-colors ${
        selected ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-line-strong'
      }`}
    >
      <OpenLink
        appointment={appointment}
        wide={wide}
        selected={selected}
        onSelect={onSelect}
        label={`Ver el turno con ${name}`}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <DateBadge date={appointment.date} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold text-brand-deep">{name}</span>
          <span className="block text-sm text-muted">
            {appointment.startTime} · {appointment.durationMinutes} min · Videoconsulta
          </span>
        </span>
      </OpenLink>
      <StatusChip status={appointment.status} />
      <div className="flex items-center gap-3">
        <PrimaryAction appointment={appointment} userId={userId} now={now} />
        {!wide && canCancel(appointment, userId, now) && (
          <button
            type="button"
            onClick={() => onCancel(appointment)}
            aria-label={`Cancelar el turno con ${name}`}
            className="text-sm font-semibold text-muted underline-offset-2 hover:text-danger hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cancelar
          </button>
        )}
      </div>
    </article>
  );
}

function HistoryRow({ appointment, userId, wide, selectedId, onSelect }: ListItemProps) {
  const name = personName(appointment, userId);
  const muted = !isActive(appointment);
  const selected = wide && selectedId === appointment.id;

  return (
    <OpenLink
      appointment={appointment}
      wide={wide}
      selected={selected}
      onSelect={onSelect}
      label={`Ver el turno con ${name}`}
      className={`flex items-center gap-4 px-4 py-3 transition-colors focus:outline-none focus-visible:bg-surface ${
        selected ? 'bg-surface-teal' : 'hover:bg-surface'
      }`}
    >
      <DateBadge date={appointment.date} muted={muted} />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] font-semibold ${muted ? 'text-muted' : 'text-brand-deep'}`}
        >
          {name}
        </span>
        <span className="block text-sm text-muted-soft">
          {appointment.startTime} · {formatPrice(appointment.price, appointment.currency)}
        </span>
      </span>
      <StatusChip status={appointment.status} />
      <span aria-hidden="true" className="text-muted-soft">
        ›
      </span>
    </OpenLink>
  );
}
