import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { DateBadge } from '../../appointments/components/agenda/DateBadge';
import { StatusChip } from '../../appointments/components/agenda/StatusChip';
import { counterpartOf } from '../../appointments/lib/myAppointments';
import { cuando } from '../../appointments/lib/timeline';
import type { Appointment } from '../../appointments/types/appointment';
import { useNow } from '../../../shared/hooks/useNow';
import { joinStateOf, timeUntilOpen } from '../../video/lib/joinWindow';
import type { UpcomingAgenda, UpcomingDay } from '../lib/dashboard';

/** Cuántos turnos se muestran por pestaña antes de "Mostrar más". */
export const UPCOMING_VISIBLE = 6;

type Tab = 'hoy' | 'manana' | 'semana';

/**
 * El pago, que es lo que el profesional quiere saber del turno: si el paciente
 * no pagó, el turno se libera solo y el horario vuelve a la agenda.
 */
const PAGO: Record<string, { label: string; className: string; dot: string }> = {
  CONFIRMADO: { label: 'Pagado', className: 'bg-surface-teal text-brand-hover', dot: 'bg-brand' },
  RESERVADO_SIN_PAGAR: {
    label: 'Sin pagar',
    className: 'bg-tag-warm text-tag-warm-ink',
    dot: 'bg-tag-warm-dot',
  },
};

function PaymentChip({ status }: { status: string }) {
  const pago = PAGO[status];
  if (!pago) return null;
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pago.className}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${pago.dot}`} />
      {pago.label}
    </span>
  );
}

const nombreDe = (a: Appointment, userId: string | null) => {
  const p = counterpartOf(a, userId);
  return p ? `${p.firstName} ${p.lastName}` : 'Paciente no disponible';
};

/** Recorta los días para que entren `max` turnos en total, sin días vacíos. */
function recortar(days: UpcomingDay[], max: number): UpcomingDay[] {
  const out: UpcomingDay[] = [];
  let quedan = max;
  for (const day of days) {
    if (quedan <= 0) break;
    out.push({ ...day, appointments: day.appointments.slice(0, quedan) });
    quedan -= day.appointments.length;
  }
  return out;
}

/** La pestaña con la que abre: el primer día que tiene algo. */
function pestanaInicial(agenda: UpcomingAgenda): Tab {
  if (agenda.counts.today > 0) return 'hoy';
  if (agenda.counts.tomorrow > 0) return 'manana';
  return 'semana';
}

/**
 * Una fila de turno. La de `destacado` (la consulta en curso o la próxima) va
 * resaltada, dice cuándo abre la sala y suma la historia clínica, que es lo que
 * se abre antes de atender.
 */
function Fila({
  turno,
  userId,
  destacado,
  now,
  conFecha = false,
}: {
  turno: Appointment;
  userId: string | null;
  destacado: boolean;
  now: Date;
  conFecha?: boolean;
}) {
  const sala = joinStateOf(turno, now);
  const nombre = nombreDe(turno, userId);
  const paciente = counterpartOf(turno, userId);
  const empezo = Date.parse(turno.scheduledAt) <= now.getTime();
  const abreEnElDia =
    sala.kind === 'TOO_EARLY' && sala.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000;

  return (
    <li className={destacado ? 'bg-surface-teal' : undefined}>
      <div className="flex items-center gap-2 pr-3">
        <Link
          to={`/turnos/${turno.id}`}
          className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
        >
          {conFecha ? <DateBadge date={turno.date} /> : null}
          <span className="w-12 flex-none text-[15px] font-bold tabular-nums text-brand-deep">
            {turno.startTime}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-brand-deep">
              {nombre}
            </span>
            <span className="block truncate text-sm text-muted">
              {destacado && (
                <span className="font-semibold text-brand-hover">
                  {empezo ? 'En curso' : 'Próximo'} ·{' '}
                </span>
              )}
              Videoconsulta · {turno.durationMinutes} min
            </span>
          </span>
          <PaymentChip status={turno.status} />
        </Link>
        {sala.kind === 'OPEN' && (
          <Link
            to={`/turnos/${turno.id}/videoconsulta`}
            className="inline-flex flex-none items-center rounded-[9px] bg-brand px-3 py-2 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label={`Entrar a la videoconsulta con ${nombre}`}
          >
            Entrar
          </Link>
        )}
      </div>
      {destacado && (paciente || abreEnElDia) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 text-[13px]">
          {abreEnElDia && sala.kind === 'TOO_EARLY' && (
            <span className="text-muted">La sala se abre {timeUntilOpen(sala.opensAt, now)}.</span>
          )}
          {paciente && (
            <Link
              to={`/pacientes/${paciente.id}/historia-clinica`}
              className="font-semibold text-brand-hover hover:underline"
            >
              Ver historia clínica
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Los próximos turnos en el panel del profesional (ENG-207).
 *
 * Es lo primero del panel: en la regularidad pidieron un pantallazo de lo que
 * viene sin tener que bajar. Pestañas Hoy, Mañana y 7 días con la cantidad en
 * cada una; la consulta en curso o la próxima va resaltada dentro de la lista,
 * en vez de una tarjeta aparte que empujaba todo hacia abajo. Cada fila abre el
 * detalle del turno y, con la sala abierta, aparece "Entrar". Los turnos que
 * esperan que el paciente elija otro horario van aparte: no ocupan agenda, pero
 * tampoco están resueltos.
 */
export function UpcomingAppointments({
  agenda,
  highlight,
  userId,
}: {
  agenda: UpcomingAgenda;
  /** La consulta en curso o la próxima: va resaltada. */
  highlight: Appointment | null;
  userId: string | null;
}) {
  const now = useNow();
  const [tab, setTab] = useState<Tab>(() => pestanaInicial(agenda));
  const [expandido, setExpandido] = useState(false);

  const pestanas: { id: Tab; label: string; count: number }[] = [
    { id: 'hoy', label: 'Hoy', count: agenda.counts.today },
    { id: 'manana', label: 'Mañana', count: agenda.counts.tomorrow },
    { id: 'semana', label: '7 días', count: agenda.counts.week },
  ];

  const diasDe = (t: Tab): UpcomingDay[] =>
    t === 'semana'
      ? agenda.days
      : agenda.days.filter((d) => d.label === (t === 'hoy' ? 'Hoy' : 'Mañana'));
  const dias = diasDe(tab);
  const total = dias.reduce((n, d) => n + d.appointments.length, 0);
  const visibles = expandido ? dias : recortar(dias, UPCOMING_VISIBLE);
  const ocultos = total - UPCOMING_VISIBLE;

  const elegir = (t: Tab) => {
    setTab(t);
    setExpandido(false);
  };

  // Flechas entre pestañas, como pide el patrón de ARIA para un tablist.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = pestanas.findIndex((p) => p.id === tab);
    const siguiente = pestanas[(i + (e.key === 'ArrowRight' ? 1 : pestanas.length - 1)) % 3];
    elegir(siguiente.id);
    document.getElementById(`tab-proximos-${siguiente.id}`)?.focus();
  };

  const vacio =
    tab === 'hoy'
      ? 'No tenés más turnos hoy.'
      : tab === 'manana'
        ? 'No tenés turnos mañana.'
        : 'No tenés turnos en los próximos 7 días.';
  // El próximo de más allá de la semana: sin él, "no tenés turnos" se leería
  // como que no hay ninguno.
  const proximoLejano =
    highlight && !agenda.days.some((d) => d.appointments.some((a) => a.id === highlight.id))
      ? highlight
      : null;

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[14px] border border-line bg-white">
        <div
          role="tablist"
          aria-label="Próximos turnos por día"
          onKeyDown={onKeyDown}
          className="grid grid-cols-3 border-b border-line"
        >
          {pestanas.map((p) => {
            const activa = p.id === tab;
            return (
              <button
                key={p.id}
                id={`tab-proximos-${p.id}`}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls="panel-proximos"
                tabIndex={activa ? 0 : -1}
                onClick={() => elegir(p.id)}
                className={`flex flex-col items-center gap-0.5 border-b-2 px-2 py-3 transition-colors focus:outline-none focus-visible:bg-surface ${
                  activa
                    ? 'border-brand text-brand-deep'
                    : 'border-transparent text-muted hover:text-brand-deep'
                }`}
              >
                <span className="text-[22px] font-bold leading-none">{p.count}</span>
                <span className="text-xs font-semibold">{p.label}</span>
              </button>
            );
          })}
        </div>

        <div
          id="panel-proximos"
          role="tabpanel"
          aria-labelledby={`tab-proximos-${tab}`}
          tabIndex={0}
          className="focus:outline-none"
        >
          {total === 0 ? (
            <div className="grid gap-1 px-4 py-4">
              <p className="text-sm text-muted">{vacio}</p>
              {proximoLejano && tab === 'semana' && (
                <ul aria-label="Tu próximo turno" className="-mx-4 mt-2 border-t border-line-soft">
                  <Fila turno={proximoLejano} userId={userId} destacado now={now} conFecha />
                </ul>
              )}
            </div>
          ) : (
            visibles.map((day) => (
              <div key={day.date}>
                {tab === 'semana' && (
                  <h3 className="border-b border-line-soft bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
                    {day.label}
                  </h3>
                )}
                <ul aria-label={day.label} className="divide-y divide-line-soft">
                  {day.appointments.map((turno) => (
                    <Fila
                      key={turno.id}
                      turno={turno}
                      userId={userId}
                      destacado={turno.id === highlight?.id}
                      now={now}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {(ocultos > 0 || agenda.later > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {ocultos > 0 && (
            <button
              type="button"
              aria-expanded={expandido}
              aria-controls="panel-proximos"
              onClick={() => setExpandido((v) => !v)}
              className="font-semibold text-brand-hover hover:underline focus:outline-none focus-visible:underline"
            >
              {expandido
                ? 'Mostrar menos'
                : `Mostrar ${ocultos} ${ocultos === 1 ? 'turno más' : 'turnos más'}`}
            </button>
          )}
          {agenda.later > 0 && (
            <span className="text-muted">
              {agenda.later === 1
                ? 'Y 1 turno más adelante.'
                : `Y ${agenda.later} turnos más adelante.`}{' '}
              <Link to="/mis-turnos" className="font-semibold text-brand-hover hover:underline">
                Ver todos
              </Link>
            </span>
          )}
        </div>
      )}

      {agenda.awaitingPatient.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-bold text-brand-deep">Esperando al paciente</h3>
          <ul
            aria-label="Esperando al paciente"
            className="divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white"
          >
            {agenda.awaitingPatient.map((turno) => {
              const plazo = cuando(turno.reprogramDeadline);
              return (
                <li key={turno.id}>
                  <Link
                    to={`/turnos/${turno.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
                  >
                    <DateBadge date={turno.date} muted />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-brand-deep">
                        {nombreDe(turno, userId)}
                      </span>
                      <span className="block text-sm text-muted">
                        Tiene que elegir otro horario o el reembolso
                        {plazo ? ` hasta el ${plazo}` : ''}.
                      </span>
                    </span>
                    <StatusChip status={turno.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
