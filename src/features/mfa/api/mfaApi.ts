import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError, type ApiError } from '../../../shared/api/apiError';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Verificación en dos pasos con una app autenticadora (ENG-88). */

export interface MfaEnrollment {
  factorId: string;
  /** El QR como imagen SVG, listo para un `<img>`. */
  qr: string;
  /** La clave para cargar a mano si no se puede escanear. */
  secret: string;
}

const SIN_REFRESH = { refreshOn401: false } as const;
const DEMASIADOS_INTENTOS = 'Demasiados intentos. Esperá un momento y volvé a probar.';

/** Igual que `toApiError`, pero un 429 (bloqueo por intentos) siempre dice lo mismo. */
async function toMfaError(response: Response, fallback: string): Promise<ApiError> {
  const error = await toApiError(response, fallback);
  return response.status === 429 ? Object.assign(error, { message: DEMASIADOS_INTENTOS }) : error;
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
  if (!response.ok) throw await toMfaError(response, 'No pudimos verificar el código.');
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
  const alta = (await response.json()) as MfaEnrollment;
  // El QR va a un `<img src>`: solo se acepta una imagen SVG en data URI.
  if (typeof alta.qr !== 'string' || !alta.qr.startsWith('data:image/svg+xml')) {
    throw new Error('No pudimos mostrar el código QR. Probá de nuevo.');
  }
  return alta;
}

export async function confirmMfaEnrollment(factorId: string, code: string): Promise<void> {
  const response = await apiFetch(
    '/me/mfa/enroll/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId, code }),
    },
    SIN_REFRESH,
  );
  if (!response.ok) throw await toMfaError(response, 'No pudimos activar la verificación.');
}

export async function disableMfa(code: string): Promise<void> {
  const response = await apiFetch(
    '/me/mfa/disable',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    },
    SIN_REFRESH,
  );
  if (!response.ok) throw await toMfaError(response, 'No pudimos desactivar la verificación.');
}
