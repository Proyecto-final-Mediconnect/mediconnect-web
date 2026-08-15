import type { ScheduleRule } from '../types/schedule';
import { toMinutes } from './generateSlots';
import { WEEKDAY_NAMES } from '../types/schedule';

/**
 * Espejo en el cliente de las validaciones de `SchedulesService` (ENG-53).
 *
 * No reemplaza a las del backend — el servidor sigue siendo la autoridad y la
 * base tiene sus CHECK. Están acá para que el profesional vea el problema
 * mientras arma la agenda, en vez de descubrirlo al apretar "Guardar".
 */

/** Devuelve el mensaje del primer problema, o `null` si la agenda es válida. */
export function validateRules(rules: ScheduleRule[]): string | null {
  for (const rule of rules) {
    const start = toMinutes(rule.startTime);
    const end = toMinutes(rule.endTime);
    const dia = WEEKDAY_NAMES[rule.weekday];

    if (end <= start) {
      return `${dia}: la hora de fin (${rule.endTime}) tiene que ser posterior a la de inicio (${rule.startTime}).`;
    }

    if (end - start < rule.slotDurationMinutes) {
      return `${dia}: la franja de ${rule.startTime} a ${rule.endTime} es más corta que un turno de ${rule.slotDurationMinutes} min, así que no genera ninguno.`;
    }
  }

  const overlap = findOverlap(rules);
  if (overlap) {
    const [a, b] = overlap;
    return `${WEEKDAY_NAMES[a.weekday]}: las franjas ${a.startTime}-${a.endTime} y ${b.startTime}-${b.endTime} se superponen.`;
  }

  return null;
}

/** Primer par de franjas que se pisan dentro del mismo día. Tocarse en el borde
 *  (09:00-13:00 y 13:00-17:00) no es solape: son contiguas. */
export function findOverlap(
  rules: ScheduleRule[],
): [ScheduleRule, ScheduleRule] | null {
  const byWeekday = new Map<number, ScheduleRule[]>();

  for (const rule of rules) {
    const sameDay = byWeekday.get(rule.weekday) ?? [];
    for (const previous of sameDay) {
      const pisa =
        toMinutes(previous.startTime) < toMinutes(rule.endTime) &&
        toMinutes(rule.startTime) < toMinutes(previous.endTime);
      if (pisa) return [previous, rule];
    }
    sameDay.push(rule);
    byWeekday.set(rule.weekday, sameDay);
  }

  return null;
}
