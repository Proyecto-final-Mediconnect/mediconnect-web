import { useMemo, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import {
  addDays,
  buildWeekPreview,
  countSlots,
  mondayOf,
  todayLocal,
} from '../lib/generateSlots';
import { WEEKDAY_NAMES, type ScheduleBlock, type ScheduleRule } from '../types/schedule';

interface SchedulePreviewProps {
  /** Franjas del FORMULARIO, no las guardadas: la preview tiene que reflejar lo
   *  que el profesional está viendo antes de apretar "Guardar" (ENG-53). */
  rules: ScheduleRule[];
  blocks: ScheduleBlock[];
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** `2026-09-02` → `2 de septiembre`. */
function formatDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} de ${MESES[month - 1]}`;
}

/**
 * Vista previa de la agenda generada (5º criterio de aceptación de ENG-53).
 *
 * Se calcula entera en el cliente, sobre el estado del formulario: el criterio
 * dice "antes de guardar", así que el backend todavía no conoce estas reglas.
 */
export function SchedulePreview({ rules, blocks }: SchedulePreviewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addDays(mondayOf(todayLocal()), weekOffset * 7),
    [weekOffset],
  );

  const days = useMemo(
    () => buildWeekPreview(rules, blocks, weekStart),
    [rules, blocks, weekStart],
  );

  const total = countSlots(days);

  return (
    <section
      aria-labelledby="preview-title"
      className="rounded-xl border border-slate-200 bg-surface p-5"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="preview-title" className="text-lg font-semibold text-ink">
            Vista previa
          </h2>
          <p className="text-sm text-muted">
            {total === 0
              ? 'Con esta configuración no se genera ningún turno.'
              : `${total} turno${total === 1 ? '' : 's'} en la semana del ${formatDate(weekStart)}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWeekOffset((w) => w - 1)}
            disabled={weekOffset === 0}
            aria-label="Semana anterior"
          >
            ←
          </Button>
          <span className="text-sm text-muted">
            {weekOffset === 0 ? 'Esta semana' : `+${weekOffset}`}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWeekOffset((w) => w + 1)}
            // 4 semanas es lo que ENG-54 va a dejar navegar al paciente al
            // reservar; mostrar más acá prometería turnos que no se van a poder
            // tomar.
            disabled={weekOffset >= 3}
            aria-label="Semana siguiente"
          >
            →
          </Button>
        </div>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((day) => (
          <li
            key={day.date}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <p className="text-sm font-semibold text-ink">
              {WEEKDAY_NAMES[day.weekday]}{' '}
              <span className="font-normal text-muted">
                {formatDate(day.date)}
              </span>
            </p>

            {day.fullyBlocked ? (
              <p className="mt-2 text-sm text-danger">Bloqueado</p>
            ) : day.slots.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Sin atención</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-1">
                  {day.slots.map((slot) => (
                    <span
                      key={slot}
                      className="rounded bg-surface-teal px-1.5 py-0.5 text-xs text-brand-deep"
                    >
                      {slot}
                    </span>
                  ))}
                </div>
                {day.blockedSlots > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    {day.blockedSlots} turno{day.blockedSlots === 1 ? '' : 's'}{' '}
                    bloqueado{day.blockedSlots === 1 ? '' : 's'}
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
