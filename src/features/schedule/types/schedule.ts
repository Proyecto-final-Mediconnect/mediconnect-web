import { z } from 'zod';

/** Duraciones admitidas, iguales al CHECK de la base y al DTO del backend. */
export const SLOT_DURATIONS = [15, 30, 45, 60] as const;
export type SlotDuration = (typeof SLOT_DURATIONS)[number];

/** `HH:MM` en 24 h. */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Una franja de atención. Un mismo día puede tener varias (mañana y tarde). */
export interface ScheduleRule {
  /** Presente solo en las que ya vinieron del backend. */
  id?: string;
  /** 0 = domingo … 6 = sábado, igual que `Date.getUTCDay()`. */
  weekday: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

/** Bloqueo puntual. `startTime`/`endTime` en null = el día completo. */
export interface ScheduleBlock {
  id: string;
  blockDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export interface Schedule {
  rules: ScheduleRule[];
  blocks: ScheduleBlock[];
}

/** Payload del `PUT`: el backend no acepta `id` (rechaza campos desconocidos
 *  con `forbidNonWhitelisted`), así que se recorta antes de mandar. */
export const scheduleRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(HHMM, 'La hora debe tener formato HH:MM'),
  endTime: z.string().regex(HHMM, 'La hora debe tener formato HH:MM'),
  slotDurationMinutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
  ]),
});

export const saveScheduleSchema = z.object({
  rules: z.array(scheduleRuleSchema),
});

export type SaveSchedulePayload = z.infer<typeof saveScheduleSchema>;

export const createBlockSchema = z
  .object({
    blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha'),
    startTime: z.string().regex(HHMM).optional(),
    endTime: z.string().regex(HHMM).optional(),
    reason: z.string().max(200).optional(),
  })
  .refine((b) => (b.startTime === undefined) === (b.endTime === undefined), {
    message:
      'Indicá las dos horas para bloquear una franja, o ninguna para el día completo.',
    path: ['endTime'],
  });

export type CreateBlockPayload = z.infer<typeof createBlockSchema>;

/** Nombres de día indexados por `weekday`. */
export const WEEKDAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

/** Orden de presentación: la semana acá arranca el lunes, aunque `weekday` siga
 *  la convención de `Date` (0 = domingo) para no traducir en cada borde. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
