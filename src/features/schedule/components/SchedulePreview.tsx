import { useMemo, useState } from 'react';
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
 *
 * Va en columna, un día por fila, porque ahora vive al costado del formulario:
 * en una grilla de cuatro columnas los horarios se apretaban hasta ser
 * ilegibles, y leer siete días de arriba abajo es además el orden en que están
 * cargados en el formulario de al lado.
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
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-5 py-[18px]">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="preview-title"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            Vista previa
          </h2>

          <div className="flex gap-1.5">
            <ArrowButton
              label="Semana anterior"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              ←
            </ArrowButton>
            <ArrowButton
              label="Semana siguiente"
              // 4 semanas es lo que ENG-54 deja navegar al paciente al reservar;
              // mostrar más acá prometería turnos que no se van a poder tomar.
              disabled={weekOffset >= 3}
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              →
            </ArrowButton>
          </div>
        </div>

        <p className="font-display mt-2.5 text-[22px] leading-[1.15] text-brand-deep">
          {weekOffset === 0 ? 'Esta semana' : `Semana del ${formatDate(weekStart)}`}
        </p>
        <p className="mt-1 text-[13px] leading-[1.6] text-muted">
          {total === 0
            ? 'Con esta configuración no se genera ningún turno.'
            : `${total} turno${total === 1 ? '' : 's'} en la semana del ${formatDate(weekStart)}.`}
        </p>
      </header>

      <ul className="divide-y divide-line-soft">
        {days.map((day) => (
          <li key={day.date} className="px-5 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-bold text-brand-deep">
                {WEEKDAY_NAMES[day.weekday]}{' '}
                <span className="font-medium text-muted-soft">{formatDate(day.date)}</span>
              </p>

              {day.fullyBlocked ? (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-danger">
                  Bloqueado
                </span>
              ) : day.slots.length === 0 ? (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
                  Sin atención
                </span>
              ) : null}
            </div>

            {!day.fullyBlocked && day.slots.length > 0 && (
              <>
                <div className="mt-2 flex flex-wrap gap-1">
                  {day.slots.map((slot) => (
                    <span
                      key={slot}
                      className="rounded-[6px] bg-surface-teal px-1.5 py-0.5 text-[11px] font-semibold text-brand-deep tabular-nums"
                    >
                      {slot}
                    </span>
                  ))}
                </div>
                {day.blockedSlots > 0 && (
                  <p className="mt-2 text-[11px] text-muted">
                    {day.blockedSlots} turno{day.blockedSlots === 1 ? '' : 's'} sin ofrecer
                    por un bloqueo
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
      className="rounded-[7px] border border-line-strong px-2.5 py-1 text-[13px] font-semibold text-muted transition-colors hover:border-brand hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
