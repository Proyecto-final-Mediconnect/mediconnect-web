import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { TestRoom, VideoConsultationAccess } from '../types/dailyRoom';

/**
 * Cliente de la videoconsulta (ENG-56) y de la prueba de cámara y micrófono.
 *
 * El navegador NUNCA habla con `api.daily.co`: la API key de Daily es de
 * servidor y exponerla en el bundle permitiría a cualquiera crear salas contra
 * la cuenta del proyecto. Todo pasa por el backend, que además es quien firma
 * los meeting tokens.
 */

/**
 * Entra a la videoconsulta de un turno (ENG-56) y devuelve la URL tokenizada.
 *
 * `POST` porque la primera llamada **crea** la consulta, la sesión de video y la
 * sala en Daily: el primero de los dos que entra la crea y el segundo la reusa.
 * No es una lectura, y la URL que devuelve lleva una credencial adentro, así que
 * tampoco debe quedar cacheada.
 */
export async function joinVideoConsultation(
  appointmentId: string,
): Promise<VideoConsultationAccess> {
  const response = await apiFetch(`/appointments/${encodeURIComponent(appointmentId)}/video`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo abrir la videoconsulta.');
  }

  return (await response.json()) as VideoConsultationAccess;
}

/**
 * Crea la sala de prueba de cámara y micrófono: una sala de Daily para una sola
 * persona, que se puede abrir en cualquier momento, sin turno.
 */
export async function createTestRoom(): Promise<TestRoom> {
  const response = await apiFetch('/video/test-room', { method: 'POST' });

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos preparar la prueba. Intentá de nuevo.');
  }

  return (await response.json()) as TestRoom;
}
