import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { Button } from '../../../shared/ui/Button';
import { useSession } from '../../auth/hooks/useSession';
import { canPay } from '../../payments/lib/checkout';
import { joinStateOf, timeUntilOpen } from '../../video/lib/joinWindow';
import { useCancelAppointment, useMyAppointments } from '../hooks/useAppointments';
import {
  canCancel,
  counterpartOf,
  formatLongDate,
  isActive,
  splitByTime,
  statusLabel,
} from '../lib/myAppointments';
import { formatPrice } from '../lib/weeks';
import type { Appointment } from '../types/appointment';

/**
 * Mis turnos (ENG-55).
 *
 * Una sola pantalla para los dos roles: `GET /appointments/me` devuelve, vía
 * RLS, los turnos donde el usuario es el paciente o el profesional. Lo único que
 * cambia según quién mire es de quién se muestra el nombre y quién ve el botón
 * de cancelar.
 */
export function MyAppointments() {
  const { user } = useSession();
  const appointments = useMyAppointments();
  const cancel = useCancelAppointment();

  /** Turno con la confirmación abierta. Cancelar no puede ser un solo click. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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

  const { upcoming, past } = splitByTime(appointments.data);

  function confirmCancel(appointmentId: string) {
    cancel.mutate(appointmentId, {
      onSettled: () => setConfirmingId(null),
    });
  }

  return (
    <div className="space-y-8">
      {cancel.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {cancel.error.message}
        </p>
      )}

      <AppointmentList
        id="proximos"
        title="Próximos"
        empty="No tenés turnos próximos."
        appointments={upcoming}
        userId={user?.id ?? null}
        confirmingId={confirmingId}
        isCancelling={cancel.isPending}
        onAskCancel={setConfirmingId}
        onConfirmCancel={confirmCancel}
        highlightFirst
      />

      <AppointmentList
        id="pasados"
        title="Pasados"
        empty="Todavía no tuviste ningún turno."
        appointments={past}
        userId={user?.id ?? null}
        confirmingId={null}
        isCancelling={false}
        onAskCancel={setConfirmingId}
        onConfirmCancel={confirmCancel}
      />
    </div>
  );
}

type AppointmentListProps = {
  id: string;
  title: string;
  empty: string;
  appointments: Appointment[];
  userId: string | null;
  confirmingId: string | null;
  isCancelling: boolean;
  onAskCancel: (id: string | null) => void;
  onConfirmCancel: (id: string) => void;
  /** Destaca el primer turno de la lista. Solo para "Próximos". */
  highlightFirst?: boolean;
};

function AppointmentList({
  id,
  title,
  empty,
  appointments,
  userId,
  confirmingId,
  isCancelling,
  onAskCancel,
  onConfirmCancel,
  highlightFirst = false,
}: AppointmentListProps) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline gap-4 border-t border-brand-deep pt-4">
        <span className="text-xs font-semibold text-brand">
          {String(appointments.length).padStart(2, '0')}
        </span>
        <h2
          id={id}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          {title}
        </h2>
      </div>

      {appointments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-3.5">
          {appointments.map((appointment, i) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              userId={userId}
              // El primero de "Próximos" es el que el paciente vino a mirar: va
              // en oscuro, como la tarjeta de próximo turno del panel.
              isNext={highlightFirst && i === 0}
              isConfirming={confirmingId === appointment.id}
              isCancelling={isCancelling}
              onAskCancel={onAskCancel}
              onConfirmCancel={onConfirmCancel}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AppointmentRow({
  appointment,
  userId,
  isNext = false,
  isConfirming,
  isCancelling,
  onAskCancel,
  onConfirmCancel,
}: {
  appointment: Appointment;
  userId: string | null;
  isNext?: boolean;
  isConfirming: boolean;
  isCancelling: boolean;
  onAskCancel: (id: string | null) => void;
  onConfirmCancel: (id: string) => void;
}) {
  const counterpart = counterpartOf(appointment, userId);
  const isPatient = appointment.patient?.id === userId;
  const cancellable = canCancel(appointment, userId);

  // Reloj propio: el botón de la videoconsulta aparece 10 minutos antes del
  // turno, y sin un tick React no tendría motivo para volver a renderizar. El
  // paciente que deja la pantalla abierta esperando es justo el que lo necesita.
  const now = useNow();
  const joinState = joinStateOf(appointment, now);
  // El pago es del paciente, no del profesional que cobra la consulta.
  const pagable = isPatient && canPay(appointment, now);

  return (
    <li
      className={`rounded-[14px] border p-6 ${
        isNext
          ? 'border-night bg-night text-white'
          : isActive(appointment)
            ? 'border-line bg-white'
            : 'border-line bg-white opacity-70'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {isNext && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
              Próximo turno
            </p>
          )}
          <p
            className={
              isNext
                ? 'font-display mt-2.5 text-[26px] leading-[1.2] text-white'
                : 'text-[17px] font-bold text-brand-deep'
            }
          >
            {formatLongDate(appointment.date)} · {appointment.startTime}
          </p>
          <p className={`mt-1.5 text-sm ${isNext ? 'text-on-night' : 'text-muted'}`}>
            {/* El nombre puede faltar si la contraparte borró su perfil: es
                preferible mostrar el turno sin nombre que esconderlo. */}
            {counterpart
              ? `${isPatient ? 'Profesional' : 'Paciente'}: ${counterpart.firstName} ${counterpart.lastName}`
              : isPatient
                ? 'Profesional no disponible'
                : 'Paciente no disponible'}
          </p>
          <p className={`mt-1 text-sm ${isNext ? 'text-on-night' : 'text-muted'}`}>
            {appointment.durationMinutes} min ·{' '}
            {formatPrice(appointment.price, appointment.currency)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isNext ? 'bg-white/10 text-on-night-strong' : 'bg-surface-teal text-brand-hover'
          }`}
        >
          {statusLabel(appointment.status)}
        </span>
      </div>

      {/* Las acciones van en una sola fila: antes cada una abría su propio
          bloque y en un turno por pagar y cancelable quedaban tres botones
          apilados uno abajo del otro. */}
      {(joinState.kind === 'OPEN' || pagable || (cancellable && !isConfirming)) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {joinState.kind === 'OPEN' && (
            <Link
              to={`/turnos/${appointment.id}/videoconsulta`}
              className="inline-flex items-center justify-center gap-2 rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Ingresar a videoconsulta
            </Link>
          )}

          {/* Solo al paciente: el profesional no paga su propia consulta. */}
          {pagable && (
            <Link
              to={`/turnos/${appointment.id}/pago`}
              className={`inline-flex items-center justify-center rounded-[9px] px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                joinState.kind === 'OPEN'
                  ? isNext
                    ? 'border border-white/25 text-white hover:border-brand-bright'
                    : 'border border-line-strong bg-white text-brand-deep hover:border-brand'
                  : 'bg-brand text-ink-deep hover:bg-brand-bright'
              }`}
            >
              Pagar la consulta
            </Link>
          )}

          {cancellable && !isConfirming && (
            <button
              type="button"
              onClick={() => onAskCancel(appointment.id)}
              className={`rounded-[9px] border px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                isNext
                  ? 'border-white/25 text-white hover:border-brand-bright focus-visible:ring-offset-night'
                  : 'border-line-strong bg-white text-brand-deep hover:border-brand'
              }`}
            >
              Cancelar turno
            </button>
          )}
        </div>
      )}

      {/* El aviso previo solo aparece dentro de las 24 horas: en un turno de
          dentro de tres semanas, "se abre en 21 días" es ruido. Es un enlace
          porque ahora se puede entrar antes y esperar en la sala. */}
      {joinState.kind === 'TOO_EARLY' &&
        joinState.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000 && (
          <p className={`mt-4 text-sm ${isNext ? 'text-on-night' : 'text-muted'}`}>
            La videoconsulta se abre {timeUntilOpen(joinState.opensAt, now)}.{' '}
            <Link
              to={`/turnos/${appointment.id}/videoconsulta`}
              className={`font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isNext ? 'text-brand-bright' : 'text-brand-hover'
              }`}
            >
              Esperar en la sala
            </Link>
          </p>
        )}

      {cancellable && isConfirming && (
        <div
          className={`mt-4 rounded-[10px] border p-4 ${
            isNext ? 'border-white/20 bg-white/5' : 'border-danger/30 bg-danger/5'
          }`}
        >
          <p className={`text-sm ${isNext ? 'text-on-night-strong' : 'text-ink'}`}>
            ¿Cancelás el turno del {formatLongDate(appointment.date)} a las {appointment.startTime}?
            El horario vuelve a quedar libre para otra persona.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => onConfirmCancel(appointment.id)}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelando…' : 'Sí, cancelar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onAskCancel(null)}
              disabled={isCancelling}
            >
              No, dejarlo
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
