import { useMutation, useQuery } from '@tanstack/react-query';
import { getPaymentStatus, startCheckout } from '../api/paymentsApi';
import { paymentOutcomeOf } from '../lib/checkout';
import type { CheckoutResult } from '../types/payment';

/** Cada cuánto se vuelve a preguntar mientras se espera el webhook. */
export const POLL_INTERVAL_MS = 2_000;

/**
 * Pide el link de pago.
 *
 * **Sin reintento automático**, por el mismo motivo que el alta de una entrada
 * de HC: es una escritura contra un proveedor de pagos. El backend es
 * idempotente, pero un reintento silencioso ante un timeout solo demora el error
 * que el paciente tiene que ver.
 */
export function useStartCheckout() {
  return useMutation({ mutationFn: startCheckout, retry: false });
}

/**
 * Estado del pago de un turno.
 *
 * @param poll Si sigue preguntando cada {@link POLL_INTERVAL_MS} mientras el
 *   pago no se resolvió. MercadoPago devuelve al paciente **antes** de mandar el
 *   webhook, así que al volver lo normal es encontrar el pago todavía pendiente.
 *   Se corta solo en cuanto hay un resultado, y la pantalla lo apaga después de
 *   un rato para no preguntar para siempre.
 * @param resultado Con lo que volvió de MercadoPago: decide si un `RECHAZADO`
 *   es del intento anterior y hay que seguir esperando (ver `paymentOutcomeOf`).
 */
export function usePaymentStatus(
  appointmentId: string,
  poll: boolean,
  resultado: CheckoutResult | null = null,
) {
  return useQuery({
    queryKey: ['payment', appointmentId] as const,
    queryFn: () => getPaymentStatus(appointmentId),
    // A diferencia del resto de las queries de la app, esta sí reintenta: corre
    // en el momento más sensible del flujo y un corte de red de un segundo no
    // tiene que terminar en "No pudimos consultar tu pago".
    retry: 2,
    refetchInterval: (query) => {
      if (!poll) return false;
      const data = query.state.data;
      return data && paymentOutcomeOf(data, resultado) !== 'ESPERANDO' ? false : POLL_INTERVAL_MS;
    },
  });
}
