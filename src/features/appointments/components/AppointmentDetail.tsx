import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { useSession } from '../../auth/hooks/useSession';
import { PolicyNotice } from '../../cancellation-policy/components/PolicyNotice';
import { usePublicProfile } from '../../catalog/hooks/usePublicProfile';
import { getPaymentStatus } from '../../payments/api/paymentsApi';
import { canPay } from '../../payments/lib/checkout';
import { joinStateOf, timeUntilOpen } from '../../video/lib/joinWindow';
import { useMyAppointments } from '../hooks/useAppointments';
import { canCancel, counterpartOf, formatLongDate, isActive } from '../lib/myAppointments';
import { appointmentTimeline, type TimelineStep } from '../lib/timeline';
import { formatPrice } from '../lib/weeks';
import type { Appointment } from '../types/appointment';
import { CancelAppointmentDialog } from './agenda/CancelAppointmentDialog';
import { RefundOutcomeBanner } from './agenda/RefundOutcomeBanner';
import { StatusChip } from './agenda/StatusChip';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** `2026-10-28` → `Miércoles 28 de octubre de 2026`. */
function longDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatLongDate(date)}`;
}

/**
 * El detalle de un turno (ENG-178), como en la app: con quién, cuándo, cuánto,
 * qué pasó desde que se reservó y qué se puede hacer ahora.
 *
 * El turno sale de la lista de "Mis turnos", que ya está en caché. El pago se
 * consulta aparte, solo del lado del paciente, y si falla la historia se arma
 * igual sin ese dato.
 */
export function AppointmentDetail({ appointmentId }: { appointmentId: string }) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const appointments = useMyAppointments();
  const now = useNow();
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const [refundOutcome, setRefundOutcome] = useState<string | null>(null);

  const appointment = appointments.data?.find((a) => a.id === appointmentId) ?? null;
  const isPatient = appointment?.patient?.id === userId;

  const payment = useQuery({
    queryKey: ['payment', appointmentId, 'detalle'],
    queryFn: () => getPaymentStatus(appointmentId),
    enabled: appointment !== null && isPatient,
    retry: false,
  });
  const policy = usePublicProfile(appointment?.professional?.id ?? '').data?.cancellationPolicy;

  if (appointments.isPending) {
    return (
      <p role="status" aria-live="polite" className="text-muted">
        Buscando el turno…
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
  if (!appointment) {
    return (
      <div className="grid justify-items-start gap-3">
        <p role="alert" className="text-[17px] font-bold text-brand-deep">
          No encontramos ese turno
        </p>
        <p className="text-sm text-muted">Puede que no sea tuyo o que ya no exista.</p>
        <Link to="/mis-turnos" className="text-sm font-semibold text-brand-hover hover:underline">
          Volver a mis turnos
        </Link>
      </div>
    );
  }

  const person = counterpartOf(appointment, userId);
  const name = person ? `${person.firstName} ${person.lastName}` : 'Sin datos';
  const steps = appointmentTimeline(appointment, payment.data ?? null, now);
  const join = joinStateOf(appointment, now);
  const payable = isPatient && canPay(appointment, now);
  const cancellable = canCancel(appointment, userId, now);
  const reschedulable = cancellable && !appointment.rescheduledAt && appointment.professional;
  const professionalId = appointment.professional?.id;

  return (
    <div className="grid gap-6">
      <Link
        to="/mis-turnos"
        className="text-xs font-semibold tracking-[0.08em] text-muted transition-colors hover:text-brand-deep"
      >
        ← MIS TURNOS
      </Link>

      {refundOutcome && (
        <RefundOutcomeBanner text={refundOutcome} onClose={() => setRefundOutcome(null)} />
      )}

      <section
        aria-labelledby="turno-con"
        className="grid gap-5 rounded-[16px] border border-line bg-white p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 flex-none items-center justify-center rounded-full bg-surface-teal text-lg font-bold text-brand-deep"
          >
            {person ? `${person.firstName.charAt(0)}${person.lastName.charAt(0)}` : '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {isPatient ? 'Profesional' : 'Paciente'}
            </p>
            <h2 id="turno-con" className="font-display text-[26px] leading-[1.2] text-brand-deep">
              {name}
            </h2>
          </div>
          <StatusChip status={appointment.status} />
        </div>

        <dl className="grid gap-x-8 gap-y-4 border-t border-line-soft pt-5 text-sm sm:grid-cols-2">
          <Dato titulo="Día">{longDay(appointment.date)}</Dato>
          <Dato titulo="Hora">
            {appointment.startTime} hs · {appointment.durationMinutes} min
          </Dato>
          <Dato titulo="Modalidad">Videoconsulta</Dato>
          <Dato titulo="Precio">{formatPrice(appointment.price, appointment.currency)}</Dato>
        </dl>

        {(join.kind === 'OPEN' || payable) && (
          <div className="flex flex-wrap gap-3">
            {join.kind === 'OPEN' ? (
              <Link
                to={`/turnos/${appointment.id}/videoconsulta`}
                className="inline-flex items-center justify-center rounded-[10px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Entrar a la sala
              </Link>
            ) : (
              <Link
                to={`/turnos/${appointment.id}/pago`}
                className="inline-flex items-center justify-center rounded-[10px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Pagar el turno
              </Link>
            )}
          </div>
        )}
        {join.kind === 'TOO_EARLY' && join.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000 && (
          <p className="text-sm text-muted">
            La sala se abre {timeUntilOpen(join.opensAt, now)}.{' '}
            <Link
              to={`/turnos/${appointment.id}/videoconsulta`}
              className="font-semibold text-brand-hover hover:underline"
            >
              Esperar en la sala
            </Link>
          </p>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="que-paso"
          className="rounded-[16px] border border-line bg-white p-6"
        >
          <h2
            id="que-paso"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            Qué pasó
          </h2>
          <ol className="mt-4">
            {steps.map((step, i) => (
              <Step key={step.key} step={step} last={i === steps.length - 1} />
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="acciones"
          className="grid gap-3 rounded-[16px] border border-line bg-white p-6"
        >
          <h2
            id="acciones"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            Acciones
          </h2>

          {reschedulable && (
            <Link
              to={`/profesionales/${professionalId}/turnos?reprogramar=${appointment.id}`}
              className="inline-flex items-center justify-center rounded-[10px] border border-line-strong bg-white px-4 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Reprogramar
            </Link>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => setToCancel(appointment)}
              className="inline-flex items-center justify-center rounded-[10px] border border-line-strong bg-white px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:border-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Cancelar el turno
            </button>
          )}
          {isPatient && !isActive(appointment) && professionalId && (
            <Link
              to={`/profesionales/${professionalId}/turnos`}
              className="inline-flex items-center justify-center rounded-[10px] bg-brand-deep px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Volver a reservar con {appointment.professional?.firstName}
            </Link>
          )}
          {!isPatient && person && (
            <Link
              to={`/pacientes/${person.id}/historia-clinica`}
              className="inline-flex items-center justify-center rounded-[10px] border border-line-strong bg-white px-4 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Historia clínica
            </Link>
          )}
          {!reschedulable &&
            !cancellable &&
            !(isPatient && !isActive(appointment)) &&
            isPatient && (
              <p className="text-sm text-muted">No hay acciones disponibles para este turno.</p>
            )}

          {isPatient && cancellable && (
            <div className="border-t border-line-soft pt-3">
              <PolicyNotice policy={policy} />
              {appointment.rescheduledAt && (
                <p className="mt-2 text-xs text-muted-soft">Este turno ya se reprogramó una vez.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <CancelAppointmentDialog
        appointment={toCancel}
        now={now}
        onClose={() => setToCancel(null)}
        onCancelled={setRefundOutcome}
      />
    </div>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{titulo}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{children}</dd>
    </div>
  );
}

const DOT: Record<TimelineStep['tone'], string> = {
  done: 'border-brand bg-brand',
  current: 'border-tag-warm-dot bg-tag-warm-dot',
  pending: 'border-line-strong bg-white',
  bad: 'border-danger bg-danger',
};

/** Un paso de la historia: un punto, la línea que lo une con el siguiente y el texto. */
function Step({ step, last }: { step: TimelineStep; last: boolean }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="flex w-3.5 flex-none flex-col items-center">
        <span className={`mt-1 size-3 rounded-full border-2 ${DOT[step.tone]}`} />
        {!last && <span className="my-1 w-0.5 flex-1 bg-line" />}
      </span>
      <span className={`min-w-0 ${last ? '' : 'pb-5'}`}>
        <span
          className={`block text-sm font-semibold ${step.tone === 'pending' ? 'text-muted' : 'text-ink'}`}
        >
          {step.title}
        </span>
        {step.when && <span className="block text-xs text-muted">{step.when}</span>}
      </span>
    </li>
  );
}
