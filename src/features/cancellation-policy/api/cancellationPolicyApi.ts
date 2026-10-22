import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { CancellationPolicy, CancellationPolicyView } from '../types/cancellationPolicy';

const BASE = '/professionals/me/cancellation-policy';

/** Política del profesional autenticado, o la de por defecto si no la configuró. */
export async function getMyCancellationPolicy(): Promise<CancellationPolicyView> {
  const response = await apiFetch(BASE);

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cargar tu política de cancelación.');
  }

  return (await response.json()) as CancellationPolicyView;
}

/**
 * Reemplaza la política. Se mandan solo los tres campos del DTO: el backend
 * corre con `forbidNonWhitelisted`, así que un `configured` de más haría fallar
 * el request con un 400.
 */
export async function saveMyCancellationPolicy({
  hoursFullRefund,
  hoursPartialRefund,
  partialRefundPercent,
}: CancellationPolicy): Promise<CancellationPolicyView> {
  const response = await apiFetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hoursFullRefund, hoursPartialRefund, partialRefundPercent }),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo guardar tu política de cancelación.');
  }

  return (await response.json()) as CancellationPolicyView;
}
