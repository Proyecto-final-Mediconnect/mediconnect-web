import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { IpsPreview } from '../lib/ipsImport';

/**
 * `POST /patients/me/ips/preview` (ENG-246): manda el resumen de salud IPS que
 * eligió el paciente y devuelve qué se cargaría en su MediPass. **No guarda
 * nada**: lo que confirma se guarda después con `PUT /patients/me/vital`.
 */
export async function previewIps(documento: unknown): Promise<IpsPreview> {
  const response = await apiFetch('/patients/me/ips/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(documento),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos leer el archivo. Probá de nuevo.');
  }

  return (await response.json()) as IpsPreview;
}
