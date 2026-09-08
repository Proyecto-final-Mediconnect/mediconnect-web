import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { Button } from '../../../shared/ui/Button';
import { useSession } from '../../auth/hooks/useSession';
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
}: AppointmentListProps) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold text-brand-deep">
        {title} <span className="text-sm font-normal text-muted">({appointments.length})</span>
      </h2>

      {appointments.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {appointments.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              userId={userId}
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
  isConfirming,
  isCancelling,
  onAskCancel,
  onConfirmCancel,
}: {
  appointment: Appointment;
  userId: string | null;
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

  return (
    <li
      className={`rounded-xl border bg-white p-5 ${
        isActive(appointment) ? 'border-slate-200' : 'border-slate-200 opacity-70'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {formatLongDate(appointment.date)} · {appointment.startTime}
          </p>
          <p className="mt-1 text-sm text-muted">
            {/* El nombre puede faltar si la contraparte borró su perfil: es
                preferible mostrar el turno sin nombre que esconderlo. */}
            {counterpart
              ? `${isPatient ? 'Profesional' : 'Paciente'}: ${counterpart.firstName} ${counterpart.lastName}`
              : isPatient
                ? 'Profesional no disponible'
                : 'Paciente no disponible'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {appointment.durationMinutes} min ·{' '}
            {formatPrice(appointment.price, appointment.currency)}
          </p>
        </div>

        <span className="rounded-full bg-surface-teal px-3 py-1 text-xs font-medium text-brand-hover">
          {statusLabel(appointment.status)}
        </span>
      </div>

      {/* La videoconsulta va primero: es la acción con ventana horaria, y
          cuando está abierta es lo único urgente de la fila. */}
      {joinState.kind === 'OPEN' && (
        <div className="mt-4">
          <Link
            to={`/turnos/${appointment.id}/videoconsulta`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Ingresar a videoconsulta
          </Link>
        </div>
      )}

      {/* El aviso previo solo aparece dentro de las 24 horas: en un turno de
          dentro de tres semanas, "se abre en 21 días" es ruido. */}
      {joinState.kind === 'TOO_EARLY' &&
        joinState.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000 && (
          <p className="mt-4 text-sm text-muted">
            La videoconsulta se abre {timeUntilOpen(joinState.opensAt, now)}.
          </p>
        )}

      {/* Historia clínica (ENG-58). Solo del lado del profesional: es quien
          escribe el asiento. Va como link secundario y sin ventana horaria — se
          escribe durante la consulta y también días después. El backend igual
          exige un turno entre los dos, así que este link es la puerta, no la
          autorización. */}
      {!isPatient && counterpart && (
        <div className="mt-4">
          <Link
            to={`/pacientes/${counterpart.id}/historia-clinica`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Historia clínica de {counterpart.firstName}
          </Link>
        </div>
      )}

      {cancellable && !isConfirming && (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => onAskCancel(appointment.id)}>
            Cancelar turno
          </Button>
        </div>
      )}

      {cancellable && isConfirming && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-ink">
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
