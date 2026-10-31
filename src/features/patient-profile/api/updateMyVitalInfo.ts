import { apiError } from '../../profile/api/apiError';
import type { PatientProfile, VitalInfoInput } from '../types/patientProfile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * `PUT /patients/me/vital` (ENG-134): guarda los datos vitales del MediPass.
 * **Reemplaza el bloque entero**: lo que no viene queda vacío, y así es como se
 * borra una alergia. Devuelve el perfil completo, ya guardado.
 */
export async function updateMyVitalInfo(input: VitalInfoInput): Promise<PatientProfile> {
  const response = await fetch(`${API_BASE_URL}/patients/me/vital`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => null)) as
    | (PatientProfile & { message?: string | string[] })
    | null;

  if (!response.ok) {
    const message = data?.message;
    throw apiError(
      response.status,
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No pudimos guardar tus datos de emergencia.'),
    );
  }

  return data as PatientProfile;
}
