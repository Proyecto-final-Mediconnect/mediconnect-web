/**
 * Tipos de la reserva de turnos (ENG-54). Espejan lo que devuelve el backend; la
 * grilla la calcula el servidor, no el navegador — lo que un paciente puede
 * reservar no puede depender de lo que calcule su propia máquina.
 */

/**
 * `PAST` no es un estado del dominio: es el reloj. Se distingue de `BLOCKED`
 * porque no dice nada del profesional — el horario de las 09:00 de hoy no está
 * "bloqueado", simplemente ya pasó.
 */
export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'PAST';

export interface AvailabilitySlot {
  /** `HH:MM`, hora local. */
  startTime: string;
  durationMinutes: number;
  status: SlotStatus;
}

export interface AvailabilityDay {
  /** `YYYY-MM-DD` */
  date: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** El profesional bloqueó el día completo. */
  fullyBlocked: boolean;
  slots: AvailabilitySlot[];
}

export interface BookableProfessional {
  id: string;
  firstName: string;
  lastName: string;
  /** `null` si todavía no publicó su precio: sin precio no se puede reservar. */
  consultationPrice: number | null;
  currency: string;
}

export interface Availability {
  professional: BookableProfessional;
  from: string;
  to: string;
  days: AvailabilityDay[];
}

export interface AppointmentParty {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Appointment {
  id: string;
  /** Instante ISO-8601 en UTC. */
  scheduledAt: string;
  /** Fecha y hora locales: las que el paciente eligió. */
  date: string;
  startTime: string;
  durationMinutes: number;
  price: number;
  currency: string;
  status: string;
  professional: AppointmentParty | null;
  patient: AppointmentParty | null;
}

/** Cuerpo del POST. No lleva precio, duración ni estado: los decide el servidor
 *  (y el backend rechaza el request si aparecen). */
export interface BookAppointmentPayload {
  professionalId: string;
  date: string;
  startTime: string;
}
