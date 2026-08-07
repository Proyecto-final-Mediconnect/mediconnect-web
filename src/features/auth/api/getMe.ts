import { apiFetch } from '../../../shared/api/apiFetch';
import type { SessionUser } from '../types/session';

/** Error de sesión ausente/expirada (401). Se distingue de un fallo real de red
 *  para que el hook de sesión no lo trate como error a reintentar. */
export class UnauthenticatedError extends Error {
  constructor() {
    super('No hay una sesión activa.');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Perfil del usuario autenticado. La sesión viaja en la cookie httpOnly que
 * setea el backend; `apiFetch` renueva el access token con el refresh token
 * rotativo si venció, así una sesión válida no se corta al expirar el JWT.
 */
export async function getMe(): Promise<SessionUser> {
  const response = await apiFetch('/me');

  if (response.status === 401) {
    throw new UnauthenticatedError();
  }

  if (!response.ok) {
    throw new Error('No pudimos verificar tu sesión. Intentá de nuevo.');
  }

  return (await response.json()) as SessionUser;
}
