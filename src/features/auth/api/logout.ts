const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Cierra la sesión: el backend limpia las cookies httpOnly. Es idempotente,
 *  así que no hace falta que el token siga siendo válido. */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
