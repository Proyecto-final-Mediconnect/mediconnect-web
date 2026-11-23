import type { Appointment } from '../types/appointment';

type DeadlineKey =
  | 'paymentDueAt'
  | 'joinOpensAt'
  | 'joinClosesAt'
  | 'manualCloseUntil'
  | 'fullRefundUntil';

const MIN = 60_000;
const HOUR = 60 * MIN;

/**
 * Completa los plazos de un turno de test como los calcula hoy el backend
 * (ENG-229): pago 15 min desde la reserva, sala 10 min antes y 15 después del
 * final, cierre manual 24 h después del final y devolución total hasta 24 h
 * antes (la política por defecto). Lo que el test ya trae no se pisa.
 *
 * Solo para tests: la web no calcula estos plazos, los lee del turno.
 */
export function withDeadlines(
  appointment: Omit<Appointment, DeadlineKey> & Partial<Pick<Appointment, DeadlineKey>>,
): Appointment {
  const start = new Date(appointment.scheduledAt).getTime();
  const end = start + appointment.durationMinutes * MIN;
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    ...appointment,
    paymentDueAt:
      appointment.paymentDueAt !== undefined
        ? appointment.paymentDueAt
        : appointment.status === 'RESERVADO_SIN_PAGAR' && appointment.createdAt
          ? iso(new Date(appointment.createdAt).getTime() + 15 * MIN)
          : null,
    joinOpensAt: appointment.joinOpensAt ?? iso(start - 10 * MIN),
    joinClosesAt: appointment.joinClosesAt ?? iso(end + 15 * MIN),
    manualCloseUntil: appointment.manualCloseUntil ?? iso(end + 24 * HOUR),
    fullRefundUntil:
      appointment.fullRefundUntil !== undefined
        ? appointment.fullRefundUntil
        : appointment.status === 'CONFIRMADO'
          ? iso(start - 24 * HOUR)
          : null,
  };
}
