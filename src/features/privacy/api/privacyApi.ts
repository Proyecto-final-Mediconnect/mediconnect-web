import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';

/** La frase que pide el backend para dar de baja la cuenta (ENG-86). */
export const FRASE_DE_BAJA = 'ELIMINAR MI CUENTA';

export interface Preferences {
  recordatoriosPorEmail: boolean;
}

/**
 * `GET /me/data-export` (derecho de acceso, ENG-86): baja el archivo con todos
 * los datos y lo descarga. El nombre lo propone el backend.
 */
export async function downloadMyData(): Promise<void> {
  const response = await apiFetch('/me/data-export');
  if (!response.ok) throw await toApiError(response, 'No pudimos preparar tus datos.');

  const nombre =
    /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ??
    'mediconnect-mis-datos.json';
  const url = URL.createObjectURL(await response.blob());
  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    // Los datos de salud no se quedan colgados en memoria del navegador.
    URL.revokeObjectURL(url);
  }
}

/** `GET /me/preferences` (derecho de oposición, ENG-86). */
export async function getPreferences(): Promise<Preferences> {
  const response = await apiFetch('/me/preferences');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus preferencias.');
  return (await response.json()) as Preferences;
}

/** `PUT /me/preferences`. */
export async function updatePreferences(preferences: Preferences): Promise<Preferences> {
  const response = await apiFetch('/me/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos guardar el cambio.');
  return (await response.json()) as Preferences;
}

/** `DELETE /me` (derecho de supresión, ENG-86). */
export async function deleteMyAccount(confirmacion: string): Promise<void> {
  const response = await apiFetch('/me', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmacion }),
  });
  if (!response.ok)
    throw await toApiError(response, 'No pudimos dar de baja tu cuenta. Probá de nuevo.');
}
