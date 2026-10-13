import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { SessionUser } from '../../auth/types/session';
import { LEGAL_VERSION } from '../legal';

/**
 * Acepta la versión vigente de los textos legales (`POST /me/legal-acceptance`,
 * ENG-140). Manda la versión que la web tiene en pantalla: si el backend ya
 * publicó otra, responde 400 en vez de registrar algo que el usuario no leyó.
 *
 * Devuelve el perfil actualizado, el mismo de `GET /me`.
 */
export async function acceptLegal(): Promise<SessionUser> {
  const response = await apiFetch('/me/legal-acceptance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: LEGAL_VERSION }),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos registrar tu aceptación. Probá de nuevo.');
  }

  return (await response.json()) as SessionUser;
}
