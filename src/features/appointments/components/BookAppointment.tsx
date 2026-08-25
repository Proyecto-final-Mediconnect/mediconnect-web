import { useMemo, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useAvailability, useBookAppointment, useMyAppointments } from '../hooks/useAppointments';
import { statusLabel } from '../lib/myAppointments';
import { BOOKING_WEEKS, MAX_WEEK_OFFSET, formatDate, formatPrice, weekRange } from '../lib/weeks';
import type { Appointment, AvailabilitySlot } from '../types/appointment';
import { WeeklyAvailabilityCalendar } from './WeeklyAvailabilityCalendar';

/**
 * Ver la disponibilidad de un profesional y reservar un turno (ENG-54).
 *
 * El paciente elige un horario, confirma y el turno queda en
 * `RESERVADO_SIN_PAGAR`. La confirmación es un paso aparte a propósito: un click
 * en la grilla no puede comprometer una consulta paga.
 */

type BookAppointmentProps = {
  professionalId: string;
};

type SelectedSlot = { date: string; startTime: string; durationMinutes: number };

export function BookAppointment({ professionalId }: BookAppointmentProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const { from, to } = useMemo(() => weekRange(weekOffset), [weekOffset]);
  const availability = useAvailability(professionalId, from, to);
  const book = useBookAppointment();
  const myAppointments = useMyAppointments();

  const professional = availability.data?.professional;
  const price = professional?.consultationPrice ?? null;

  /** Turnos ya reservados con ESTE profesional, que es lo que el paciente quiere
   *  ver acá. La lista completa es "Mis turnos" (ENG-55). */
  const withThisProfessional = (myAppointments.data ?? []).filter(
    (appointment) => appointment.professional?.id === professionalId,
  );

  function selectSlot(date: string, slot: AvailabilitySlot) {
    setBooked(null);
    book.reset();
    setSelected({
      date,
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes,
    });
  }

  function confirm() {
    if (!selected) return;

    book.mutate(
      {
        professionalId,
        date: selected.date,
        startTime: selected.startTime,
      },
      {
        onSuccess: (appointment) => {
          setBooked(appointment);
          setSelected(null);
        },
      },
    );
  }

  if (availability.isPending) {
    return (
      <p role="status" aria-live="polite" className="text-muted">
        Cargando disponibilidad…
      </p>
    );
  }

  if (availability.isError) {
    return (
      <p role="alert" className="text-danger">
        {availability.error.message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-ink">
          {professional?.firstName} {professional?.lastName}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {price === null
            ? 'Todavía no publicó su precio de consulta, así que no se puede reservar.'
            : `Consulta: ${formatPrice(price, professional!.currency)}`}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Semana del {formatDate(from)} al {formatDate(to)}
          {availability.isFetching && ' · actualizando…'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWeekOffset((week) => week - 1)}
            disabled={weekOffset === 0}
          >
            ← Semana anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWeekOffset((week) => week + 1)}
            disabled={weekOffset >= MAX_WEEK_OFFSET}
          >
            Semana siguiente →
          </Button>
        </div>
      </div>

      <WeeklyAvailabilityCalendar
        days={availability.data.days}
        selected={selected}
        onSelect={selectSlot}
      />

      {weekOffset >= MAX_WEEK_OFFSET && (
        <p className="text-xs text-muted">
          La agenda se publica hasta {BOOKING_WEEKS} semanas adelante.
        </p>
      )}

      {book.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {book.error.message}
        </p>
      )}

      {selected && (
        <ConfirmPanel
          selected={selected}
          price={price}
          currency={professional?.currency ?? 'ARS'}
          isPending={book.isPending}
          onConfirm={confirm}
          onCancel={() => setSelected(null)}
        />
      )}

      {booked && <BookedNotice appointment={booked} />}

      {withThisProfessional.length > 0 && (
        <MyAppointmentsWithProfessional appointments={withThisProfessional} />
      )}
    </div>
  );
}

function ConfirmPanel({
  selected,
  price,
  currency,
  isPending,
  onConfirm,
  onCancel,
}: {
  selected: SelectedSlot;
  price: number | null;
  currency: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section
      aria-labelledby="confirmar-turno"
      className="rounded-xl border border-brand/40 bg-surface-teal p-5"
    >
      <h3 id="confirmar-turno" className="font-semibold text-ink">
        Confirmar turno
      </h3>
      <p className="mt-1 text-sm text-ink">
        {formatDate(selected.date)} a las {selected.startTime} · {selected.durationMinutes} min
        {price !== null && ` · ${formatPrice(price, currency)}`}
      </p>
      {/* El estado inicial no es un detalle que se pueda ocultar: el turno queda
          reservado pero sin pagar hasta que exista el pago (ENG-63, Release 2). */}
      <p className="mt-2 text-sm text-muted">
        El turno queda reservado sin pagar. El pago online se habilita más adelante.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={onConfirm} disabled={isPending || price === null}>
          {isPending ? 'Reservando…' : 'Confirmar reserva'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}

function BookedNotice({ appointment }: { appointment: Appointment }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-brand/40 bg-surface-teal px-4 py-3 text-sm text-ink"
    >
      Reservamos tu turno para el {formatDate(appointment.date)} a las {appointment.startTime}.
    </p>
  );
}

/** Confirma el criterio "el turno aparece en la lista del paciente" sin invadir
 *  la pantalla de "Mis turnos", que es ENG-55. */
function MyAppointmentsWithProfessional({ appointments }: { appointments: Appointment[] }) {
  return (
    <section
      aria-labelledby="mis-turnos-profesional"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 id="mis-turnos-profesional" className="font-semibold text-ink">
        Tus turnos con este profesional
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-ink">
              {formatDate(appointment.date)} · {appointment.startTime}
            </span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">
              {statusLabel(appointment.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
