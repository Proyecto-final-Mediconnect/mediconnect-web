import { formatDate } from './weeks';
import type { Appointment } from '../types/appointment';

/**
 * Lógica pura de "Mis turnos" (ENG-55): en qué lista cae cada turno, cuál se
 * puede cancelar y cómo se nombra cada estado.
 *
 * Está separada del componente para poder testear las reglas sin montar React —
 * mismo criterio que `generateSlots` en ENG-53 y `weeks` en ENG-54.
 */

/** Estados que ocupan el horario. Espeja `ACTIVE_STATUSES` del backend y el
 *  índice parcial de la base: si allá cambia, acá también. */
const ACTIVE_STATUSES = ['RESERVADO_SIN_PAGAR', 'CONFIRMADO'];

/**
 * Nombre visible de cada estado.
 *
 * `RESERVADO_SIN_PAGAR` no se muestra como "Reservado" a secas: mientras el pago
 * no exista (ENG-63, Release 2) el turno es una retención, y el paciente tiene
 * que saberlo. Un estado desconocido se muestra crudo en vez de romper la fila.
 */
const STATUS_LABELS: Record<string, string> = {
  RESERVADO_SIN_PAGAR: 'Sin pagar',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  COMPLETADO: 'Completado',
  NO_ASISTIO: 'No asistió',
  LIBERADO: 'Liberado por falta de pago',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Un turno cancelado o liberado se muestra apagado, no como uno vigente. */
export function isActive(appointment: Appointment): boolean {
  return ACTIVE_STATUSES.includes(appointment.status);
}

export interface SplitAppointments {
  upcoming: Appointment[];
  past: Appointment[];
}

/**
 * Separa los turnos en "Próximos" y "Pasados".
 *
 * El corte es el **instante** (`scheduledAt`), no el estado: un turno cancelado
 * de la semana que viene sigue siendo futuro y se muestra en Próximos con su
 * chip de "Cancelado". Mandarlo a Pasados escondería que se canceló justo donde
 * el paciente lo va a buscar.
 *
 * Se compara contra `scheduledAt` (UTC) y no contra `date`/`startTime`, que son
 * la hora local ya formateada: la comparación de instantes no depende del huso
 * del navegador.
 *
 * Los próximos quedan del más cercano al más lejano —el orden en que llegan del
 * backend— y los pasados al revés: en un historial interesa lo último primero.
 */
export function splitByTime(
  appointments: Appointment[],
  now: Date = new Date(),
): SplitAppointments {
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];

  for (const appointment of appointments) {
    if (new Date(appointment.scheduledAt).getTime() > now.getTime()) {
      upcoming.push(appointment);
    } else {
      past.push(appointment);
    }
  }

  return { upcoming, past: past.reverse() };
}

/**
 * Si el paciente puede cancelar este turno.
 *
 * Las tres condiciones son las mismas que revalida el backend en el `where` del
 * update. Acá solo se decide si mostrar el botón: la autoridad es el servidor, y
 * un turno que cambia de estado en otra pestaña va a fallar con 409 aunque el
 * botón siga en pantalla.
 *
 * `userId` puede ser `null` mientras la sesión carga; en ese caso no se ofrece
 * cancelar, porque todavía no se sabe si el que mira es el paciente o el
 * profesional.
 */
export function canCancel(
  appointment: Appointment,
  userId: string | null,
  now: Date = new Date(),
): boolean {
  return (
    userId !== null &&
    appointment.patient?.id === userId &&
    isActive(appointment) &&
    new Date(appointment.scheduledAt).getTime() > now.getTime()
  );
}

/** Horas después del final del turno en que el profesional todavía lo puede
 *  cerrar a mano. Espeja `MANUAL_CLOSE_HOURS_AFTER` del backend (ENG-189). */
export const MANUAL_CLOSE_HOURS_AFTER = 24;

/**
 * Si el profesional puede marcar que el paciente no se presentó (ENG-189):
 * turno confirmado, desde la hora del turno hasta 24 h después del final.
 * Decide si se dibuja el botón; el backend revalida lo mismo.
 */
export function canMarkNoShow(
  appointment: Appointment,
  userId: string | null,
  now: Date = new Date(),
): boolean {
  if (userId === null || appointment.professional?.id !== userId) return false;
  if (appointment.status !== 'CONFIRMADO') return false;
  const start = new Date(appointment.scheduledAt).getTime();
  const until = start + appointment.durationMinutes * 60_000 + MANUAL_CLOSE_HOURS_AFTER * 3_600_000;
  return now.getTime() >= start && now.getTime() <= until;
}

/**
 * La otra persona del turno: el profesional si mirás como paciente, el paciente
 * si mirás como profesional. El mismo endpoint sirve a los dos roles, así que la
 * contraparte se deduce de quién está mirando y no de un flag aparte.
 */
export function counterpartOf(appointment: Appointment, userId: string | null) {
  return appointment.patient?.id === userId ? appointment.professional : appointment.patient;
}

/** `2026-08-17` → `17 de agosto de 2026`. En un historial que cruza años, el año
 *  no es opcional. */
export function formatLongDate(date: string): string {
  return `${formatDate(date)} de ${date.slice(0, 4)}`;
}

/** Cuántas consultas pasadas se muestran al reservar con el mismo profesional. */
export const PAST_WITH_PROFESSIONAL = 3;

/**
 * Los turnos con un profesional que vale la pena ver al reservar con él: los
 * próximos, del más cercano al más lejano, y las últimas
 * {@link PAST_WITH_PROFESSIONAL} consultas completadas. Los liberados y
 * cancelados no: con un paciente frecuente eran más de 30 filas que tapaban
 * la reserva. La lista entera está en "Mis turnos".
 */
export function relevantWithProfessional(
  appointments: Appointment[],
  now: Date = new Date(),
): { shown: Appointment[]; hidden: number } {
  const t = now.getTime();
  const upcoming = appointments
    .filter((a) => isActive(a) && Date.parse(a.scheduledAt) > t)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const past = appointments
    .filter((a) => a.status === 'COMPLETADO' && Date.parse(a.scheduledAt) <= t)
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
    .slice(0, PAST_WITH_PROFESSIONAL);
  const shown = [...upcoming, ...past];
  return { shown, hidden: appointments.length - shown.length };
}
