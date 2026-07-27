import { apiError } from '../../profile/api/apiError';
import type { PatientProfile, PatientProfileInput } from '../types/patientProfile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Guarda (crea o actualiza) el perfil de paciente. PUT porque se envía el
 *  perfil completo: la fila se crea en la primera carga. El error lleva el
 *  status (ver `apiError`) para distinguir sesión vencida de fallo del backend. */
export async function updateMyProfile(input: PatientProfileInput): Promise<PatientProfile> {
  const response = await fetch(`${API_BASE_URL}/patients/me`, {
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
      Array.isArray(message) ? message.join(' ') : (message ?? 'No se pudo guardar tu perfil.'),
    );
  }

  return data as PatientProfile;
}
