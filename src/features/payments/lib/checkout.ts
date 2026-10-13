import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import type { CheckoutResult, PaymentStatus, PaymentStatusView } from '../types/payment';

/**
 * Reglas del pago de un turno (ENG-63).
 *
 * Son puras y viven acá por el mismo motivo que `myAppointments.ts`: se pueden
 * testear sin montar React, y el backend revalida exactamente esto. **Nada de lo
 * que decide este archivo autoriza un cobro**: decide qué se dibuja.
 */

/**
 * El `resultado` con el que MercadoPago devolvió al paciente, o `null` si entró
 * a la pantalla de pago por primera vez. Cualquier otro valor se ignora: viene
 * en la URL y la puede escribir cualquiera.
 */
export function checkoutResultOf(search: URLSearchParams): CheckoutResult | null {
  const valor = search.get('resultado');
  return valor === 'exito' || valor === 'pendiente' || valor === 'fallo' ? valor : null;
}

/**
 * Qué pasó con el pago, según el backend.
 *
 * - `CONFIRMADO`: el webhook confirmó el turno. Es lo único que cuenta como
 *   éxito: la vuelta de MercadoPago con `resultado=exito` no confirma nada.
 * - `RECHAZADO`: MercadoPago rechazó el pago. El turno sigue reservado y se
 *   puede reintentar.
 * - `SIN_TURNO`: el pago se acreditó, pero el turno ya no estaba esperando
 *   pago (se canceló o se liberó en el medio). El webhook no lo confirma.
 * - `ESPERANDO`: todavía no llegó el webhook, o el pago quedó pendiente (por
 *   ejemplo, en efectivo).
 */
export type PaymentOutcome = 'CONFIRMADO' | 'RECHAZADO' | 'SIN_TURNO' | 'ESPERANDO';

export function paymentOutcomeOf(view: PaymentStatusView): PaymentOutcome {
  if (view.appointmentStatus === 'CONFIRMADO') return 'CONFIRMADO';
  if (view.status === 'RECHAZADO') return 'RECHAZADO';
  if (view.status === 'APROBADO' && view.appointmentStatus !== 'RESERVADO_SIN_PAGAR') {
    return 'SIN_TURNO';
  }
  return 'ESPERANDO';
}

/** Nombre visible de cada estado de pago. */
const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDIENTE: 'Pago pendiente',
  APROBADO: 'Pago aprobado',
  RECHAZADO: 'Pago rechazado',
  REEMBOLSADO: 'Pago reembolsado',
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return STATUS_LABELS[status];
}

/**
 * Si este turno admite un pago, y si no, por qué.
 *
 * `CONFIRMADO` es el estado al que lleva el pago aprobado, así que un turno ya
 * confirmado no se vuelve a cobrar. El resto de los estados no tienen consulta
 * que pagar. Un turno que ya pasó tampoco: cobrarlo no le devuelve la consulta a
 * nadie.
 */
export type Payability =
  | { kind: 'PAYABLE' }
  | { kind: 'ALREADY_PAID' }
  | { kind: 'NOT_PAYABLE'; reason: string };

export function payabilityOf(appointment: Appointment, now: Date = new Date()): Payability {
  if (appointment.status === 'CONFIRMADO') return { kind: 'ALREADY_PAID' };

  if (appointment.status !== 'RESERVADO_SIN_PAGAR') {
    return {
      kind: 'NOT_PAYABLE',
      reason:
        appointment.status === 'CANCELADO'
          ? 'Este turno está cancelado.'
          : appointment.status === 'LIBERADO'
            ? 'Este turno se liberó por falta de pago y el horario volvió a quedar disponible.'
            : 'Este turno ya no admite un pago.',
    };
  }

  if (new Date(appointment.scheduledAt).getTime() <= now.getTime()) {
    return { kind: 'NOT_PAYABLE', reason: 'Este turno ya pasó.' };
  }

  return { kind: 'PAYABLE' };
}

/** Si conviene ofrecer "Pagar" en una fila de "Mis turnos". */
export function canPay(appointment: Appointment, now: Date = new Date()): boolean {
  return payabilityOf(appointment, now).kind === 'PAYABLE';
}

/**
 * Detalle del importe.
 *
 * Hoy es una sola línea: **MediConnect no agrega ningún cargo propio**. Se
 * devuelve como lista igual porque el checkout de MercadoPago puede sumar costos
 * de financiación; esos los muestra MercadoPago en su pantalla.
 */
export interface AmountLine {
  label: string;
  amount: number;
  /** Renglón del total: se resalta y no se suma otra vez. */
  isTotal?: boolean;
}

export function amountLinesFor(appointment: Appointment): AmountLine[] {
  return [
    { label: `Consulta de ${appointment.durationMinutes} minutos`, amount: appointment.price },
    { label: 'Total', amount: appointment.price, isTotal: true },
  ];
}

/** Importe formateado de un turno, con su moneda. */
export function formatAmount(appointment: Appointment): string {
  return formatPrice(appointment.price, appointment.currency);
}

/** El turno de `id` dentro de la lista de "Mis turnos". */
export function findAppointment(
  appointments: Appointment[],
  id: string | undefined,
): Appointment | null {
  if (!id) return null;
  return appointments.find((a) => a.id === id) ?? null;
}

/**
 * Medios que acepta el checkout de MercadoPago (ADR-013).
 *
 * Se listan para que el paciente sepa con qué va a poder pagar antes de salir de
 * MediConnect. **Ninguno se completa acá**: los datos de tarjeta se cargan del
 * lado de MercadoPago, que es lo que mantiene a MediConnect fuera del alcance
 * PCI.
 */
export const PAYMENT_METHODS = [
  'Dinero en cuenta de MercadoPago',
  'Tarjeta de crédito',
  'Tarjeta de débito',
  'Efectivo (Rapipago, Pago Fácil)',
] as const;
