import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Verificación en dos pasos con una app autenticadora (ENG-88). */

export interface MfaEnrollment {
  factorId: string;
  /** El QR como imagen SVG, listo para un `<img>`. */
  qr: string;
  /** La clave para cargar a mano si no se puede escanear. */
  secret: string;
}

/**
 * `POST /auth/mfa/verify`: el segundo paso del ingreso. El token del primero
 * viaja en una cookie httpOnly; acá solo va el código.
 *
 * Con `fetch` directo y no con `apiFetch`: todavía no hay sesión, y un 401 acá
 * no es una sesión vencida para renovar sino un código que llegó tarde.
 */
export async function verifyLoginCode(code: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos verificar el código.');
}

export async function getMfaStatus(): Promise<{ activa: boolean }> {
  const response = await apiFetch('/me/mfa');
  if (!response.ok)
    throw await toApiError(response, 'No pudimos ver tu verificación en dos pasos.');
  return (await response.json()) as { activa: boolean };
}

export async function startMfaEnrollment(): Promise<MfaEnrollment> {
  const response = await apiFetch('/me/mfa/enroll', { method: 'POST' });
  if (!response.ok) throw await toApiError(response, 'No pudimos empezar la activación.');
  return (await response.json()) as MfaEnrollment;
}

export async function confirmMfaEnrollment(factorId: string, code: string): Promise<void> {
  const response = await apiFetch('/me/mfa/enroll/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factorId, code }),
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos activar la verificación.');
}

export async function disableMfa(code: string): Promise<void> {
  const response = await apiFetch('/me/mfa/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos desactivar la verificación.');
}
