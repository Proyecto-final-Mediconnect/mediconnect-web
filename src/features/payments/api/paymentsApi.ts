import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { CheckoutLink, PaymentStatusView } from '../types/payment';

const base = (appointmentId: string) =>
  `/appointments/${encodeURIComponent(appointmentId)}/payment`;

/**
 * Pide el link de Checkout Pro del turno (ENG-63).
 *
 * El backend lo crea la primera vez y después devuelve el mismo: el id del turno
 * es la clave de idempotencia, así que un doble click no genera dos cobros. Sin
 * body: monto, moneda y paciente salen del turno, del lado del servidor.
 */
export async function startCheckout(appointmentId: string): Promise<CheckoutLink> {
  const response = await apiFetch(base(appointmentId), { method: 'POST' });

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos iniciar el pago. Probá de nuevo.');
  }

  return (await response.json()) as CheckoutLink;
}

/** Estado del pago y del turno, el que escribió el webhook de ENG-64. */
export async function getPaymentStatus(appointmentId: string): Promise<PaymentStatusView> {
  const response = await apiFetch(base(appointmentId));

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos consultar el estado del pago.');
  }

  return (await response.json()) as PaymentStatusView;
}
