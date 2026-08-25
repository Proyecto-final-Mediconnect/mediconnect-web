import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { MeetingSession, SpikeRoom } from '../types/dailyRoom';

/**
 * Cliente de los endpoints del spike de Daily (ENG-51).
 *
 * El navegador NUNCA habla con `api.daily.co`: la API key de Daily es de
 * servidor y exponerla en el bundle permitiría a cualquiera crear salas contra
 * la cuenta del proyecto. Todo pasa por el backend, que además es quien firma
 * los meeting tokens.
 */

const BASE = '/video/spike';

/** Crea una sala privada de prueba con un token por rol. */
export async function createSpikeRoom(): Promise<SpikeRoom> {
  const response = await apiFetch(`${BASE}/rooms`, { method: 'POST' });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo crear la sala de prueba.');
  }

  return (await response.json()) as SpikeRoom;
}

/**
 * Métricas de las sesiones ya finalizadas de una sala.
 *
 * Devuelve `[]` mientras la llamada sigue en curso: Daily publica los datos de
 * la sesión recién cuando termina. La UI lo trata como "todavía no hay datos",
 * no como un error.
 */
export async function getSpikeSessions(roomName: string): Promise<MeetingSession[]> {
  const response = await apiFetch(`${BASE}/rooms/${encodeURIComponent(roomName)}/sessions`);

  if (!response.ok) {
    throw await toApiError(response, 'No se pudieron leer las métricas.');
  }

  return (await response.json()) as MeetingSession[];
}

/** Borra la sala al terminar la prueba, para no dejarla consumiendo cuota. */
export async function deleteSpikeRoom(roomName: string): Promise<void> {
  const response = await apiFetch(`${BASE}/rooms/${encodeURIComponent(roomName)}`, {
    method: 'DELETE',
  });

  // 204 sin cuerpo: no se parsea la respuesta exitosa.
  if (!response.ok) {
    throw await toApiError(response, 'No se pudo borrar la sala.');
  }
}
