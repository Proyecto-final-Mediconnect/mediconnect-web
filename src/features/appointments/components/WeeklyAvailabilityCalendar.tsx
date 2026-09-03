import { useState } from 'react';
import { WEEKDAY_NAMES } from '../../schedule/types/schedule';
import { formatDate } from '../lib/weeks';
import type { AvailabilityDay, AvailabilitySlot, SlotStatus } from '../types/appointment';

/**
 * Calendario de disponibilidad (ENG-54), con el diseño del canvas.
 *
 * Se elige primero el día y después el horario, en vez de mostrar los siete días
 * con todos sus horarios a la vez. Con una agenda cargada esa grilla es una
 * pared de números; acá cada día muestra cuántos huecos libres tiene y el
 * detalle aparece al elegirlo.
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
  /** Rango visible, ya formateado. En el diseño encabeza el calendario. */
  rangeLabel: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
};

/** Estilo y texto de cada estado. El color no es lo único que los distingue: el
 *  ocupado va tachado y el bloqueado con borde punteado, para que se lean también
 *  sin percibir color. */
const STATUS_STYLES: Record<SlotStatus, string> = {
  AVAILABLE: 'border-brand text-brand-deep hover:bg-brand/10',
  BOOKED: 'border-line bg-surface text-muted line-through',
  BLOCKED: 'border-dashed border-line-strong bg-surface text-muted',
  PAST: 'border-line bg-white text-muted-soft',
};

const STATUS_LABELS: Record<SlotStatus, string> = {
  AVAILABLE: 'disponible',
  BOOKED: 'ocupado',
  BLOCKED: 'bloqueado por el profesional',
  PAST: 'ya pasó',
};

/** Cuántos horarios reservables tiene el día. */
function freeCount(day: AvailabilityDay): number {
  return day.slots.filter((slot) => slot.status === 'AVAILABLE').length;
}

export function WeeklyAvailabilityCalendar({
  days,
  selected,
  onSelect,
  rangeLabel,
  onPreviousWeek,
  onNextWeek,
  canGoBack,
  canGoForward,
}: WeeklyAvailabilityCalendarProps) {
  const withSlots = days.filter((day) => day.slots.length > 0);

  // El día abierto por defecto es el primero con horarios: abrir uno vacío
  // obligaría a un click extra antes de ver nada.
  const [openDate, setOpenDate] = useState<string | null>(null);
  const activeDate =
    openDate !== null && days.some((d) => d.date === openDate)
      ? openDate
      : (withSlots[0]?.date ?? null);
  const activeDay = days.find((day) => day.date === activeDate) ?? null;

  return (
    <section className="rounded-[14px] border border-line bg-white p-6 lg:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-[18px]">
        <h2 className="font-display text-[22px] text-brand-deep" aria-live="polite">
          {rangeLabel}
        </h2>

        <div className="flex gap-1.5">
          <ArrowButton label="Semana anterior" disabled={!canGoBack} onClick={onPreviousWeek}>
            ←
          </ArrowButton>
          <ArrowButton label="Semana siguiente" disabled={!canGoForward} onClick={onNextWeek}>
            →
          </ArrowButton>
        </div>
      </header>

      {withSlots.length === 0 ? (
        <p className="mt-6 rounded-[10px] border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
          El profesional no publicó horarios de atención para esta semana. Probá con la siguiente.
        </p>
      ) : (
        <>
          <ul className="mt-[22px] grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => (
              <li key={day.date}>
                <DayCard
                  day={day}
                  isActive={day.date === activeDate}
                  onOpen={() => setOpenDate(day.date)}
                />
              </li>
            ))}
          </ul>

          {activeDay && (
            <div className="mt-7 border-t border-line-soft pt-[22px]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Horarios · {WEEKDAY_NAMES[activeDay.weekday].toLowerCase()}{' '}
                {formatDate(activeDay.date)}
              </h3>

              {activeDay.fullyBlocked && (
                <p className="mt-3 text-sm text-muted">No atiende este día.</p>
              )}

              {activeDay.slots.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Sin horarios publicados para este día.</p>
              ) : (
                <ul className="mt-3.5 flex flex-wrap gap-2.5">
                  {activeDay.slots.map((slot) => (
                    <li key={slot.startTime}>
                      <SlotButton
                        date={activeDay.date}
                        slot={slot}
                        isSelected={
                          selected?.date === activeDay.date &&
                          selected.startTime === slot.startTime
                        }
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-5 max-w-[520px] text-[13px] leading-[1.6] text-muted">
                Estos son los horarios reales del profesional. Si otra persona reserva uno mientras
                elegís, desaparece de la lista.
              </p>

              <Legend />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-[7px] border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:border-brand hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DayCard({
  day,
  isActive,
  onOpen,
}: {
  day: AvailabilityDay;
  isActive: boolean;
  onOpen: () => void;
}) {
  const libres = freeCount(day);
  const [, , dayNumber] = day.date.split('-');

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={isActive}
      aria-label={`${WEEKDAY_NAMES[day.weekday]} ${formatDate(day.date)} — ${
        libres === 0 ? 'sin horarios libres' : `${libres} horarios libres`
      }`}
      className={`w-full rounded-[10px] border px-2 py-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        isActive
          ? 'border-brand-deep bg-brand-deep text-white'
          : libres > 0
            ? 'border-line bg-white text-brand-deep hover:border-brand'
            : 'border-line bg-surface text-muted-soft'
      }`}
    >
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
        {WEEKDAY_NAMES[day.weekday].slice(0, 3)}
      </span>
      <span className="font-display mt-1 block text-[26px] leading-none">{dayNumber}</span>
      <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.06em] opacity-70">
        {libres === 0 ? 'sin lugar' : `${libres} libre${libres === 1 ? '' : 's'}`}
      </span>
    </button>
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
      className={`rounded-[8px] border px-3.5 py-2.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed ${
        isSelected ? 'border-brand-deep bg-brand-deep text-white' : STATUS_STYLES[slot.status]
      }`}
    >
      {slot.startTime}
    </button>
  );
}

function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
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
