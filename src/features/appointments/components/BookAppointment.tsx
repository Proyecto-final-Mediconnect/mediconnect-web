import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAvailability, useBookAppointment, useMyAppointments } from '../hooks/useAppointments';
import { statusLabel } from '../lib/myAppointments';
import { BOOKING_WEEKS, MAX_WEEK_OFFSET, formatDate, formatPrice, weekRange } from '../lib/weeks';
import type { Appointment, AvailabilitySlot } from '../types/appointment';
import { PASO_HORARIO, PASO_LISTO, PASO_REVISION } from '../lib/bookingSteps';
import { BookingStepper } from './BookingStepper';
import { WeeklyAvailabilityCalendar } from './WeeklyAvailabilityCalendar';

/**
 * Ver la disponibilidad de un profesional y reservar un turno (ENG-54), con el
 * diseño del canvas.
 *
 * El paciente elige un horario, confirma y el turno queda en
 * `RESERVADO_SIN_PAGAR`. La confirmación es un paso aparte a propósito: un click
 * en la grilla no puede comprometer una consulta paga.
 *
 * El panel de revisión queda pegado al hacer scroll: mientras se recorren los
 * días hay que poder ver qué se está por reservar y cuánto sale.
 *
 * Los cinco pasos del stepper existen los cinco en el front. Los dos últimos
 * —Pago y Listo— están construidos pero **simulados**: ENG-63 todavía no expuso
 * los endpoints de MercadoPago, así que el turno sigue quedando en
 * `RESERVADO_SIN_PAGAR` hasta que existan. La pantalla de pago lo dice de frente.
 */

type BookAppointmentProps = {
  professionalId: string;
};

type SelectedSlot = { date: string; startTime: string; durationMinutes: number };

/** En qué paso está la pantalla. Reservado ya salta al pago, que es lo que
 *  sigue: "Listo" se alcanza recién en la pantalla de confirmación. */
function pasoActual(hasSelection: boolean, booked: boolean): number {
  if (booked) return PASO_LISTO - 1;
  return hasSelection ? PASO_REVISION : PASO_HORARIO;
}

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

  const rangeLabel = `Semana del ${formatDate(from)} al ${formatDate(to)}${
    availability.isFetching ? ' · actualizando…' : ''
  }`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="grid gap-5">
        <BookingStepper actual={pasoActual(selected !== null, booked !== null)} />

        <WeeklyAvailabilityCalendar
          days={availability.data.days}
          selected={selected}
          onSelect={selectSlot}
          rangeLabel={rangeLabel}
          onPreviousWeek={() => setWeekOffset((week) => week - 1)}
          onNextWeek={() => setWeekOffset((week) => week + 1)}
          canGoBack={weekOffset > 0}
          canGoForward={weekOffset < MAX_WEEK_OFFSET}
        />

        {weekOffset >= MAX_WEEK_OFFSET && (
          <p className="text-xs text-muted">
            La agenda se publica hasta {BOOKING_WEEKS} semanas adelante.
          </p>
        )}

        {withThisProfessional.length > 0 && (
          <MyAppointmentsWithProfessional appointments={withThisProfessional} />
        )}
      </div>

      <PanelRevision
        professional={professional}
        price={price}
        selected={selected}
        booked={booked}
        isPending={book.isPending}
        errorMessage={book.isError ? book.error.message : undefined}
        onConfirm={confirm}
        onCancel={() => setSelected(null)}
      />
    </div>
  );
}

function PanelRevision({
  professional,
  price,
  selected,
  booked,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: {
  professional: { firstName: string; lastName: string; currency: string } | undefined;
  price: number | null;
  selected: SelectedSlot | null;
  booked: Appointment | null;
  isPending: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const currency = professional?.currency ?? 'ARS';
  const fullName = professional ? `${professional.firstName} ${professional.lastName}` : '—';

  return (
    <aside className="overflow-hidden rounded-[14px] border border-line bg-white lg:sticky lg:top-24">
      <header className="border-b border-line-soft px-[22px] py-[18px]">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Revisá la información
        </h2>
      </header>

      <dl className="grid gap-[11px] border-b border-line-soft px-[22px] py-[18px] text-sm font-medium text-ink">
        <Fila titulo="Profesional">{fullName}</Fila>
        <Fila titulo="Duración">
          {selected ? `${selected.durationMinutes} min` : 'Elegí un horario'}
        </Fila>
        <Fila titulo="Fecha">{selected ? formatDate(selected.date) : '—'}</Fila>
        <Fila titulo="Hora">
          {selected ? (
            <span className="font-bold text-brand-deep">{selected.startTime}</span>
          ) : (
            '—'
          )}
        </Fila>
      </dl>

      <div className="grid gap-3.5 px-[22px] py-[18px]">
        {/* El estado inicial no es un detalle que se pueda ocultar: el turno
            queda reservado pero sin pagar hasta que exista el pago (ENG-63). */}
        <p className="rounded-[10px] border border-brand/30 bg-surface-teal px-4 py-3 text-[13px] leading-[1.6] text-brand-deep">
          El turno queda <strong className="font-bold">reservado sin pagar</strong>. El pago online
          se habilita más adelante.
        </p>

        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-muted">Total</span>
          {/* Sin precio publicado no hay total que mostrar: una raya es más
              honesta que un $ 0, que se leería como una consulta gratis. */}
          <span className="text-[28px] font-bold text-brand-deep">
            {price === null ? '—' : formatPrice(price, currency)}
          </span>
        </div>

        {price === null && (
          <p className="text-[13px] leading-[1.6] text-muted">
            El profesional todavía no publicó su precio de consulta, así que no se puede reservar.
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {errorMessage}
          </p>
        )}

        {booked ? (
          <>
            <p
              role="status"
              className="rounded-[10px] border border-brand/40 bg-surface-teal px-4 py-3 text-sm text-ink"
            >
              Reservamos tu turno para el {formatDate(booked.date)} a las {booked.startTime}.
            </p>
            <Link
              to={`/turnos/${booked.id}/pago`}
              className="w-full rounded-[10px] bg-brand py-[15px] text-center text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Pagar la consulta
            </Link>
          </>
        ) : (
          <>
            <h3 className="sr-only">Confirmar turno</h3>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending || price === null || selected === null}
              className="w-full rounded-[10px] bg-brand py-[15px] text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Reservando…' : 'Confirmar reserva'}
            </button>
            {selected && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="text-[13px] font-semibold text-muted underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Elegir otro horario
              </button>
            )}
          </>
        )}

        <p className="text-xs leading-[1.6] text-muted-soft">
          Vas a poder cancelarlo desde “Mis turnos”. El plazo y el reembolso los
          define cada profesional.
        </p>
      </div>
    </aside>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Confirma el criterio "el turno aparece en la lista del paciente" sin invadir
 *  la pantalla de "Mis turnos", que es ENG-55. */
function MyAppointmentsWithProfessional({ appointments }: { appointments: Appointment[] }) {
  return (
    <section
      aria-labelledby="mis-turnos-profesional"
      className="rounded-[14px] border border-line bg-white p-6"
    >
      <h2 id="mis-turnos-profesional" className="text-base font-bold text-brand-deep">
        Tus turnos con este profesional
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2 last:border-0 last:pb-0"
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
