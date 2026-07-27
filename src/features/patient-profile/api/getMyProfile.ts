import { apiError } from '../../profile/api/apiError';
import type { PatientProfile } from '../types/patientProfile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Perfil del paciente autenticado. La sesión viaja en la cookie httpOnly, por
 *  eso `credentials: 'include'`. El error lleva el status para que react-query
 *  no reintente un 401 y la UI pueda mandar al login (ver `apiError`). */
export async function getMyProfile(): Promise<PatientProfile> {
  const response = await fetch(`${API_BASE_URL}/patients/me`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = data?.message;
    throw apiError(
      response.status,
      Array.isArray(message) ? message.join(' ') : (message ?? 'No se pudo cargar tu perfil.'),
    );
  }

  return (await response.json()) as PatientProfile;
}
