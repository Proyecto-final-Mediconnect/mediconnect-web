import { useMutation, useQuery } from '@tanstack/react-query';
import { getPaymentStatus, startCheckout } from '../api/paymentsApi';
import { paymentOutcomeOf } from '../lib/checkout';

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
 */
export function usePaymentStatus(appointmentId: string, poll: boolean) {
  return useQuery({
    queryKey: ['payment', appointmentId] as const,
    queryFn: () => getPaymentStatus(appointmentId),
    retry: false,
    refetchInterval: (query) => {
      if (!poll) return false;
      const data = query.state.data;
      return data && paymentOutcomeOf(data) !== 'ESPERANDO' ? false : POLL_INTERVAL_MS;
    },
  });
}
