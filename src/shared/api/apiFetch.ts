const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Refresh en curso, para que N requests que fallan a la vez disparen una sola
 *  renovación en lugar de una por request (y no se pisen rotando el token). */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Se libera en el próximo tick para que los que esperaban usen este resultado.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

/**
 * `fetch` contra la API con la sesión en cookies httpOnly. Si la respuesta es
 * 401 (access token vencido), intenta renovar UNA vez con el refresh token
 * rotativo y reintenta el request original. Si la renovación falla, devuelve
 * el 401 para que el llamador trate al usuario como deslogueado.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const options: RequestInit = { ...init, credentials: 'include' };

  const response = await fetch(url, options);
  if (response.status !== 401) return response;

  const renewed = await refreshSession();
  if (!renewed) return response;

  return fetch(url, options);
}
