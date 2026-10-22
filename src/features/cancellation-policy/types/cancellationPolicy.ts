/**
 * Política de cancelación de un profesional (ENG-67), con los nombres que usa
 * el backend en `GET`/`PUT /professionals/me/cancellation-policy` y en el
 * perfil público.
 *
 * - Cancelando con `hoursFullRefund` horas o más de anticipación: 100 %.
 * - Con `hoursPartialRefund` horas o más: `partialRefundPercent` %.
 * - Con menos: nada.
 */
export interface CancellationPolicy {
  hoursFullRefund: number;
  hoursPartialRefund: number;
  partialRefundPercent: number;
}

/** Lo que ve el profesional: si `configured` es `false`, son los valores por defecto. */
export interface CancellationPolicyView extends CancellationPolicy {
  configured: boolean;
}
