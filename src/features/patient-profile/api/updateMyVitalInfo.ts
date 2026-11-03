import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { PatientProfile, VitalInfoInput } from '../types/patientProfile';

/**
 * `PUT /patients/me/vital` (ENG-134): guarda los datos vitales del MediPass.
 * **Reemplaza el bloque entero**: lo que no viene queda vacío, y así es como se
 * borra una alergia. Devuelve el perfil completo, ya guardado.
 *
 * Va por `apiFetch` para que, si el access token venció mientras el paciente
 * completaba el panel, se renueve la sesión y no se pierda lo que cargó.
 */
export async function updateMyVitalInfo(input: VitalInfoInput): Promise<PatientProfile> {
  const response = await apiFetch('/patients/me/vital', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos guardar tus datos de emergencia.');
  }

  return (await response.json()) as PatientProfile;
}
