import { WEEKDAY_NAMES } from '../../schedule/types/schedule';
import { formatDate, formatShortDate } from '../lib/weeks';
import type { AvailabilityDay, AvailabilitySlot, SlotStatus } from '../types/appointment';

/**
 * Calendario semanal de disponibilidad (ENG-54).
 *
 * Los horarios no disponibles se muestran, no se esconden: el criterio de
 * aceptación pide que disponibles, ocupados y bloqueados se distingan
 * visualmente. Un hueco vacío no comunica lo mismo que un horario tachado — el
 * paciente que ve 09:00 ocupado y 09:30 libre entiende que el profesional
 * atiende a esa hora y que ese turno ya se lo llevaron.
 *
 * Cada horario es un `<button>`; los no reservables van `disabled` con un
 * `aria-label` que dice por qué. Un `<div>` con `onClick` habría dejado afuera a
 * quien navega con teclado y no habría anunciado nada.
 */

type WeeklyAvailabilityCalendarProps = {
  days: AvailabilityDay[];
  /** Horario elegido, para marcarlo mientras se confirma. */
  selected: { date: string; startTime: string } | null;
  onSelect: (date: string, slot: AvailabilitySlot) => void;
};

/** Estilo y texto de cada estado. El color no es lo único que los distingue: el
 *  ocupado va tachado y el bloqueado con borde punteado, para que se lean también
 *  sin percibir color. */
const STATUS_STYLES: Record<SlotStatus, string> = {
  AVAILABLE:
    'border-brand text-brand hover:bg-brand/10 focus-visible:ring-2 focus-visible:ring-brand',
  BOOKED: 'border-slate-200 bg-slate-100 text-muted line-through',
  BLOCKED: 'border-dashed border-slate-300 bg-slate-50 text-muted',
  PAST: 'border-slate-200 bg-white text-slate-300',
};

const STATUS_LABELS: Record<SlotStatus, string> = {
  AVAILABLE: 'disponible',
  BOOKED: 'ocupado',
  BLOCKED: 'bloqueado por el profesional',
  PAST: 'ya pasó',
};

export function WeeklyAvailabilityCalendar({
  days,
  selected,
  onSelect,
}: WeeklyAvailabilityCalendarProps) {
  const hasAnySlot = days.some((day) => day.slots.length > 0);

  if (!hasAnySlot) {
    return (
      <p className="rounded-xl border border-slate-200 bg-surface px-4 py-6 text-center text-sm text-muted">
        El profesional no publicó horarios de atención para esta semana. Probá con la siguiente.
      </p>
    );
  }

  return (
    <div>
      <Legend />

      {/* En pantallas chicas los días van uno debajo del otro: siete columnas de
          horarios en un teléfono son ilegibles. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.date}
            aria-label={`${WEEKDAY_NAMES[day.weekday]} ${formatDate(day.date)}`}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <header className="mb-2 border-b border-slate-100 pb-2">
              <p className="text-sm font-semibold text-ink">{WEEKDAY_NAMES[day.weekday]}</p>
              <p className="text-xs text-muted">{formatShortDate(day.date)}</p>
            </header>

            {day.fullyBlocked && <p className="mb-2 text-xs text-muted">No atiende este día.</p>}

            {day.slots.length === 0 ? (
              <p className="text-xs text-muted">Sin horarios.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5 lg:flex-col">
                {day.slots.map((slot) => (
                  <li key={slot.startTime}>
                    <SlotButton
                      date={day.date}
                      slot={slot}
                      isSelected={
                        selected?.date === day.date && selected.startTime === slot.startTime
                      }
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function SlotButton({
  date,
  slot,
  isSelected,
  onSelect,
}: {
  date: string;
  slot: AvailabilitySlot;
  isSelected: boolean;
  onSelect: (date: string, slot: AvailabilitySlot) => void;
}) {
  const isAvailable = slot.status === 'AVAILABLE';

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => onSelect(date, slot)}
      aria-pressed={isAvailable ? isSelected : undefined}
      aria-label={`${slot.startTime} del ${formatDate(date)} — ${STATUS_LABELS[slot.status]}`}
      className={`w-full rounded-md border px-2 py-1 text-sm font-medium transition-colors focus:outline-none disabled:cursor-not-allowed ${
        isSelected ? 'bg-brand text-white border-brand' : STATUS_STYLES[slot.status]
      }`}
    >
      {slot.startTime}
    </button>
  );
}

function Legend() {
  return (
    <ul className="mb-4 flex flex-wrap gap-4 text-xs text-muted">
      {(['AVAILABLE', 'BOOKED', 'BLOCKED', 'PAST'] as const).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block h-3 w-6 rounded border ${STATUS_STYLES[status]}`}
          />
          {STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  );
}
