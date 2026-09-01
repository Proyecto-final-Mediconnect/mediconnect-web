import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { ClinicalEntry, NewClinicalEntryPayload } from '../types/clinicalRecord';

/**
 * Historia clínica de un paciente (ENG-58).
 *
 * Un solo endpoint para los dos roles: **RLS decide qué devuelve**. El paciente
 * ve su historia completa, el profesional las entradas que firmó. El front no
 * ramifica por rol.
 */

const base = (patientId: string) =>
  `/patients/${encodeURIComponent(patientId)}/clinical-record`;

/** Entradas de la HC, de la más vieja a la más nueva. */
export async function getClinicalRecord(patientId: string): Promise<ClinicalEntry[]> {
  const response = await apiFetch(base(patientId));

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cargar la historia clínica.');
  }

  return (await response.json()) as ClinicalEntry[];
}

/**
 * Agrega una entrada firmada por el profesional autenticado.
 *
 * Devuelve la entrada ya sellada, con su lugar en la cadena y su hash.
 */
export async function addClinicalEntry(
  patientId: string,
  payload: NewClinicalEntryPayload,
): Promise<ClinicalEntry> {
  const response = await apiFetch(base(patientId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo guardar la entrada.');
  }

  return (await response.json()) as ClinicalEntry;
}
