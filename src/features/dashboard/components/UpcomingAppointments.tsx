import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DateBadge } from '../../appointments/components/agenda/DateBadge';
import { StatusChip } from '../../appointments/components/agenda/StatusChip';
import { counterpartOf } from '../../appointments/lib/myAppointments';
import { cuando } from '../../appointments/lib/timeline';
import type { Appointment } from '../../appointments/types/appointment';
import { useNow } from '../../../shared/hooks/useNow';
import { canJoin } from '../../video/lib/joinWindow';
import type { UpcomingAgenda } from '../lib/dashboard';

/** Cuántos turnos se muestran antes de "Mostrar más": entran en una pantalla. */
export const UPCOMING_VISIBLE = 6;

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
function recortar(days: UpcomingAgenda['days'], max: number): UpcomingAgenda['days'] {
  const out: UpcomingAgenda['days'] = [];
  let quedan = max;
  for (const day of days) {
    if (quedan <= 0) break;
    out.push({ ...day, appointments: day.appointments.slice(0, quedan) });
    quedan -= day.appointments.length;
  }
  return out;
}

/**
 * Los próximos turnos en el panel del profesional (ENG-207).
 *
 * Arriba, el pantallazo: cuántos turnos hay hoy, mañana y en la semana. Debajo,
 * los de la semana por día, con la hora, el paciente, la modalidad y el pago;
 * cada fila abre el detalle del turno (y desde ahí la historia clínica) y, con
 * la sala abierta, aparece "Entrar". Los que esperan que el paciente elija otro
 * horario van aparte: no ocupan agenda, pero tampoco están resueltos.
 *
 * El turno de la tarjeta "Tu próxima consulta" se cuenta en el resumen pero no
 * se repite en la lista.
 */
export function UpcomingAppointments({
  agenda,
  userId,
  hasNext,
}: {
  agenda: UpcomingAgenda;
  userId: string | null;
  /** Si hay tarjeta de próxima consulta: cambia el texto de la semana vacía. */
  hasNext: boolean;
}) {
  const now = useNow();
  const [expandido, setExpandido] = useState(false);

  const total = agenda.days.reduce((n, d) => n + d.appointments.length, 0);
  const visibles = expandido ? agenda.days : recortar(agenda.days, UPCOMING_VISIBLE);
  const ocultos = total - UPCOMING_VISIBLE;

  const resumen = [
    { label: 'Hoy', value: agenda.counts.today },
    { label: 'Mañana', value: agenda.counts.tomorrow },
    { label: 'Próximos 7 días', value: agenda.counts.week },
  ];

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-3" aria-label="Resumen de tus turnos">
        {resumen.map(({ label, value }) => (
          <div key={label} className="rounded-[14px] border border-line bg-white px-4 py-3">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className="mt-1 text-[24px] font-bold leading-none text-brand-deep">{value}</dd>
          </div>
        ))}
      </dl>

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

      {total === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong bg-white px-4 py-3 text-sm text-muted">
          {hasNext
            ? 'No tenés otros turnos en los próximos 7 días.'
            : 'No tenés turnos en los próximos 7 días.'}
        </p>
      ) : (
        <div className="grid gap-4" id="proximos-turnos-dias">
          {visibles.map((day) => (
            <div key={day.date} className="grid gap-2">
              <h3 className="text-sm font-bold text-brand-deep">{day.label}</h3>
              <ul
                aria-label={day.label}
                className="divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white"
              >
                {day.appointments.map((turno) => (
                  <li key={turno.id} className="flex items-center gap-2 pr-3">
                    <Link
                      to={`/turnos/${turno.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
                    >
                      <span className="w-12 flex-none text-[15px] font-bold tabular-nums text-brand-deep">
                        {turno.startTime}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-brand-deep">
                          {nombreDe(turno, userId)}
                        </span>
                        <span className="block text-sm text-muted">
                          Videoconsulta · {turno.durationMinutes} min
                        </span>
                      </span>
                      <PaymentChip status={turno.status} />
                    </Link>
                    {canJoin(turno, now) && (
                      <Link
                        to={`/turnos/${turno.id}/videoconsulta`}
                        className="inline-flex flex-none items-center rounded-[9px] bg-brand px-3 py-2 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        aria-label={`Entrar a la videoconsulta con ${nombreDe(turno, userId)}`}
                      >
                        Entrar
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(ocultos > 0 || agenda.later > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {ocultos > 0 && (
            <button
              type="button"
              aria-expanded={expandido}
              aria-controls="proximos-turnos-dias"
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
    </div>
  );
}
