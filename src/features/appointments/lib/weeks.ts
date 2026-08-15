import { addDays, mondayOf, todayLocal } from '../../schedule/lib/generateSlots';

/**
 * Navegación entre semanas de la pantalla de reserva (ENG-54).
 *
 * Reusa los helpers de fecha de ENG-53 en vez de reescribirlos: son funciones
 * puras y ya testeadas, y dos implementaciones de "sumar un día" es exactamente
 * el tipo de duplicación que después se desincroniza.
 * TODO: cuando ENG-53 y ENG-54 estén mergeados, mover `addDays` / `mondayOf` /
 * `todayLocal` a `shared/lib/dates` — hoy son de la feature `schedule` y esto es
 * un import cruzado entre features.
 */

/**
 * Cuántas semanas puede mirar el paciente hacia adelante, contando la actual.
 * Es el "navegación entre las próximas 4 semanas" del criterio de aceptación, y
 * coincide con el horizonte de 28 días que valida el backend.
 *
 * No hace falta recortar la última semana contra ese horizonte: la semana 0
 * arranca el lunes de la semana en curso, que nunca es posterior a hoy, así que
 * el domingo de la semana 3 nunca cae más allá de hoy + 27 días.
 */
export const BOOKING_WEEKS = 4;

export const MAX_WEEK_OFFSET = BOOKING_WEEKS - 1;

export interface WeekRange {
  /** Lunes, `YYYY-MM-DD`. */
  from: string;
  /** Domingo, `YYYY-MM-DD`. */
  to: string;
}

/**
 * Rango de la semana que está `offset` semanas adelante de la actual.
 *
 * La semana arranca el **lunes**, aunque `weekday` siga la convención de `Date`
 * (0 = domingo): es cómo se lee un calendario acá, y es el mismo criterio que usa
 * la vista previa de la agenda en ENG-53.
 *
 * El `from` de la semana 0 puede quedar en el pasado —hoy es jueves, el lunes ya
 * pasó— y eso está bien: el backend acepta un `from` pasado y devuelve esos
 * horarios marcados como `PAST`. Mostrarlos en gris es información útil; recortar
 * la semana dejaría una grilla mocha.
 */
export function weekRange(offset: number, today = todayLocal()): WeekRange {
  const from = addDays(mondayOf(today), offset * 7);
  return { from, to: addDays(from, 6) };
}

const MONTHS = [
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
export function formatDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} de ${MONTHS[month - 1]}`;
}

/** `2026-09-02` → `2/9`, para los encabezados angostos de la grilla. */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day}/${month}`;
}

/** Precio en pesos, sin decimales: los honorarios se cargan en enteros. */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
