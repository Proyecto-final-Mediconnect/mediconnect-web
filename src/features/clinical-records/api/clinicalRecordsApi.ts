import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type {
  ClinicalEntry,
  CorrectionPayload,
  NewClinicalEntryPayload,
} from '../types/clinicalRecord';

/**
 * Historia clínica de un paciente (ENG-58, ENG-60).
 *
 * Un solo endpoint para los dos roles: **RLS decide qué devuelve**. Los dos ven
 * la historia completa —el paciente la suya, el profesional la de un paciente
 * con el que tiene turno— y el front no ramifica por rol.
 *
 * Desde ENG-60 el backend responde **403** a quien no tiene relación con el
 * paciente, donde antes devolvía `[]`. Es un error accionable y no uno de red:
 * la pantalla lo trata aparte.
 */

const base = (patientId: string) => `/patients/${encodeURIComponent(patientId)}/clinical-record`;

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

/**
 * Corrige una entrada agregando un asiento nuevo que la referencia (ENG-100).
 *
 * `POST` a una subruta y no `PATCH` sobre la entrada porque **nada se modifica**:
 * la original queda con su hash y su lugar en la cadena, y la corrección es una
 * entrada más. Devuelve la corrección ya sellada.
 *
 * Los errores que trae este endpoint y que la pantalla distingue: **403** si la
 * entrada la firmó otro profesional, **409** si ya tiene una corrección.
 */
export async function correctClinicalEntry(
  patientId: string,
  entryId: string,
  payload: CorrectionPayload,
): Promise<ClinicalEntry> {
  const response = await apiFetch(
    `${base(patientId)}/${encodeURIComponent(entryId)}/corrections`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo guardar la corrección.');
  }

  return (await response.json()) as ClinicalEntry;
}
