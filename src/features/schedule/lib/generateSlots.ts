import type { ScheduleBlock, ScheduleRule } from '../types/schedule';

/**
 * Generación de la agenda para la VISTA PREVIA (ENG-53).
 *
 * Vive en el cliente y no en la API a propósito: el criterio de aceptación pide
 * "vista previa de la agenda generada **antes de guardar**", así que el servidor
 * todavía no tiene esas reglas. La preview se calcula sobre el estado del
 * formulario, sin persistir nada.
 *
 * ENG-54 va a necesitar la versión de servidor (un paciente no puede confiar en
 * lo que calcule su propio navegador para reservar). Estas son funciones puras
 * justamente para que esa lógica se pueda portar y contrastar.
 *
 * Toda la aritmética de fechas usa UTC: `new Date(y, m, d)` en hora local se
 * corre un día cuando el navegador está en un huso negativo, y sumar días con
 * horas locales se rompe en los cambios de horario. Acá las fechas son solo
 * etiquetas `YYYY-MM-DD`, no instantes, así que UTC es la elección segura.
 */

/** `HH:MM` → minutos desde medianoche. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutos desde medianoche → `HH:MM`. */
export function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Suma días a una fecha `YYYY-MM-DD` y devuelve otra `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Hoy en `YYYY-MM-DD` según el reloj del navegador.
 *
 * Se arma con las partes locales y no con `toISOString()`, que da la fecha UTC:
 * en Argentina, después de las 21:00, la preview arrancaría mostrando el día
 * siguiente. Acá "hoy" es el hoy del profesional que está mirando la pantalla.
 */
export function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Día de la semana (0 = domingo) de una fecha `YYYY-MM-DD`. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Lunes de la semana que contiene a `date`. */
export function mondayOf(date: string): string {
  const weekday = weekdayOf(date);
  // Domingo (0) pertenece a la semana que arrancó 6 días antes, no a la que
  // arranca al día siguiente: sin este caso la preview del domingo saltaría a
  // la semana que viene.
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(date, offset);
}

/** Turnos que genera una franja, como horas de inicio. */
export function slotsForRule(rule: ScheduleRule): string[] {
  const start = toMinutes(rule.startTime);
  const end = toMinutes(rule.endTime);
  const step = rule.slotDurationMinutes;

  if (step <= 0 || end <= start) return [];

  const slots: string[] = [];
  // `+ step <= end`: un turno que no entra completo en la franja no se ofrece.
  // Con 09:00-10:20 y turnos de 30 salen 09:00 y 09:30, no un 10:00 que se
  // pasaría del horario de atención.
  for (let t = start; t + step <= end; t += step) {
    slots.push(toTime(t));
  }
  return slots;
}

/** Un bloqueo sin horas tapa el día entero. */
function isFullDay(block: ScheduleBlock): boolean {
  return block.startTime === null || block.endTime === null;
}

/** ¿El turno [slot, slot+duración) pisa la franja bloqueada? */
function slotHitsBlock(
  slotStart: number,
  slotEnd: number,
  block: ScheduleBlock,
): boolean {
  const blockStart = toMinutes(block.startTime!);
  const blockEnd = toMinutes(block.endTime!);
  return slotStart < blockEnd && blockStart < slotEnd;
}

/** Un día de la vista previa. */
export interface PreviewDay {
  /** `YYYY-MM-DD` */
  date: string;
  weekday: number;
  /** Horas de inicio de los turnos que quedan disponibles. */
  slots: string[];
  /** Hay un bloqueo de día completo: no se atiende, aunque haya franjas. */
  fullyBlocked: boolean;
  /** Turnos que se cayeron por un bloqueo parcial de ese día. */
  blockedSlots: number;
}

/**
 * Arma los 7 días de la semana que arranca en `weekStart`, aplicando las franjas
 * semanales y descontando los bloqueos que caigan dentro.
 */
export function buildWeekPreview(
  rules: ScheduleRule[],
  blocks: ScheduleBlock[],
  weekStart: string,
): PreviewDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const weekday = weekdayOf(date);
    const dayBlocks = blocks.filter((b) => b.blockDate === date);

    if (dayBlocks.some(isFullDay)) {
      return { date, weekday, slots: [], fullyBlocked: true, blockedSlots: 0 };
    }

    const allSlots = rules
      .filter((rule) => rule.weekday === weekday)
      .flatMap((rule) =>
        slotsForRule(rule).map((slot) => ({
          slot,
          duration: rule.slotDurationMinutes,
        })),
      );

    const free = allSlots.filter(({ slot, duration }) => {
      const start = toMinutes(slot);
      return !dayBlocks.some((b) => slotHitsBlock(start, start + duration, b));
    });

    return {
      date,
      weekday,
      // Varias franjas del mismo día pueden generar turnos desordenados entre sí
      // (la tarde se agrega después de la mañana solo si el usuario la cargó en
      // ese orden). Se ordena por hora para que la preview se lea como un día.
      slots: free.map(({ slot }) => slot).sort(),
      fullyBlocked: false,
      blockedSlots: allSlots.length - free.length,
    };
  });
}

/** Total de turnos de una semana, para el resumen de la preview. */
export function countSlots(days: PreviewDay[]): number {
  return days.reduce((total, day) => total + day.slots.length, 0);
}
