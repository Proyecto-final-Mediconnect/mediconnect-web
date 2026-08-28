import type { Appointment } from '../../appointments/types/appointment';

/**
 * Cuándo se puede entrar a la videoconsulta de un turno (ENG-56).
 *
 * Lógica pura, sin React, para poder testear los bordes del reloj sin montar
 * componentes — mismo criterio que `myAppointments.ts` en ENG-55.
 *
 * **Esto no autoriza nada.** Decide si se dibuja el botón; quien decide si se
 * entra es el backend, que revalida exactamente lo mismo en
 * `video-consultation.service.ts`. Existe acá para no tener que preguntarle al
 * servidor en cada tick del reloj, no para ahorrarle la validación.
 */

/**
 * Minutos antes del horario en que se abre la sala. Es el criterio de aceptación
 * de ENG-56. Espeja `JOIN_OPENS_MINUTES_BEFORE` del backend: si cambia una,
 * tiene que cambiar la otra.
 */
export const JOIN_OPENS_MINUTES_BEFORE = 10;

/** Tolerancia después del final del turno. Espeja `JOIN_GRACE_MINUTES_AFTER`. */
export const JOIN_GRACE_MINUTES_AFTER = 15;

/** Estados del turno que tienen videoconsulta. Espeja `JOINABLE_STATUSES`. */
const JOINABLE_STATUSES = ['RESERVADO_SIN_PAGAR', 'CONFIRMADO'];

export type JoinState =
  /** Todavía falta: se muestra a partir de cuándo se va a poder entrar. */
  | { kind: 'TOO_EARLY'; opensAt: Date }
  | { kind: 'OPEN' }
  | { kind: 'CLOSED' }
  /** Cancelado o liberado: no hay consulta que abrir. */
  | { kind: 'NOT_APPLICABLE' };

export interface JoinWindow {
  opensAt: Date;
  closesAt: Date;
}

export function joinWindowFor(appointment: Appointment): JoinWindow {
  // Se calcula sobre `scheduledAt` (UTC) y no sobre `date` + `startTime`, que ya
  // son la hora local formateada: comparar instantes no depende del huso del
  // navegador ni de que el reloj del usuario esté en Argentina.
  const start = new Date(appointment.scheduledAt).getTime();

  return {
    opensAt: new Date(start - JOIN_OPENS_MINUTES_BEFORE * 60_000),
    closesAt: new Date(
      start + (appointment.durationMinutes + JOIN_GRACE_MINUTES_AFTER) * 60_000,
    ),
  };
}

export function joinStateOf(appointment: Appointment, now: Date = new Date()): JoinState {
  if (!JOINABLE_STATUSES.includes(appointment.status)) {
    return { kind: 'NOT_APPLICABLE' };
  }

  const { opensAt, closesAt } = joinWindowFor(appointment);

  if (now < opensAt) return { kind: 'TOO_EARLY', opensAt };
  if (now > closesAt) return { kind: 'CLOSED' };

  return { kind: 'OPEN' };
}

export function canJoin(appointment: Appointment, now: Date = new Date()): boolean {
  return joinStateOf(appointment, now).kind === 'OPEN';
}

/**
 * Cuánto falta para que abra la sala, en texto.
 *
 * Se redondea hacia arriba para no decir "en 0 minutos" durante los últimos 59
 * segundos, que es cuando el usuario está mirando la pantalla esperando el botón.
 */
export function timeUntilOpen(opensAt: Date, now: Date = new Date()): string {
  const minutes = Math.ceil((opensAt.getTime() - now.getTime()) / 60_000);

  if (minutes <= 1) return 'en menos de un minuto';
  if (minutes < 60) return `en ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'en una hora' : `en ${hours} horas`;

  const days = Math.round(hours / 24);
  return days === 1 ? 'mañana' : `en ${days} días`;
}
