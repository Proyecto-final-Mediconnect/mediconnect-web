import { apiFetch } from '../../../shared/api/apiFetch';
import { apiError } from '../../profile/api/apiError';
import type { MeetingSession, SpikeRoom } from '../types/dailyRoom';

/**
 * Cliente de los endpoints del spike de Daily (ENG-51).
 *
 * El navegador NUNCA habla con `api.daily.co`: la API key de Daily es de
 * servidor y exponerla en el bundle permitiría a cualquiera crear salas contra
 * la cuenta del proyecto. Todo pasa por el backend, que además es quien firma
 * los meeting tokens.
 *
 * Reusa `features/profile/api/apiError` en vez de crear otro helper: ENG-53 lo
 * está moviendo a `shared/api/apiError`, y adelantarse acá haría que los dos PRs
 * peleen por el mismo archivo nuevo.
 */

const BASE = '/video/spike';

/** Traduce una respuesta fallida al `ApiError` con status que espera la UI. */
async function toError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = data?.message;

  return apiError(
    response.status,
    Array.isArray(message) ? message.join(' ') : (message ?? fallback),
  );
}

/** Crea una sala privada de prueba con un token por rol. */
export async function createSpikeRoom(): Promise<SpikeRoom> {
  const response = await apiFetch(`${BASE}/rooms`, { method: 'POST' });

  if (!response.ok) {
    throw await toError(response, 'No se pudo crear la sala de prueba.');
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
    throw await toError(response, 'No se pudieron leer las métricas.');
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
    throw await toError(response, 'No se pudo borrar la sala.');
  }
}
