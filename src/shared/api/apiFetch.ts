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

/** `code` del 403 del `LegalAcceptedGuard` del backend (ENG-140). */
export const LEGAL_NOT_ACCEPTED = 'LEGAL_NOT_ACCEPTED';

let legalNotAcceptedHandler: (() => void) | null = null;

/**
 * Registra qué hacer cuando el backend responde 403 `LEGAL_NOT_ACCEPTED`: el
 * usuario no aceptó la versión vigente de los textos legales. Lo registra
 * `main.tsx` para marcar la sesión cacheada y que `RequireAuth` muestre el
 * pedido de aceptación. Hace falta porque la sesión puede tener hasta 5 minutos
 * (`staleTime`): si se publica una versión nueva con la app abierta, `GET /me`
 * cacheado sigue diciendo que aceptó y todo lo demás falla con 403.
 *
 * Devuelve la función para desregistrarlo.
 */
export function onLegalNotAccepted(handler: () => void): () => void {
  legalNotAcceptedHandler = handler;
  return () => {
    if (legalNotAcceptedHandler === handler) legalNotAcceptedHandler = null;
  };
}

async function notifyIfLegalNotAccepted(response: Response): Promise<void> {
  if (response.status !== 403 || !legalNotAcceptedHandler) return;
  // `clone`: el body lo sigue leyendo quien hizo el request.
  const body = (await response
    .clone()
    .json()
    .catch(() => null)) as { code?: unknown } | null;
  if (body?.code === LEGAL_NOT_ACCEPTED) legalNotAcceptedHandler();
}

/**
 * `fetch` contra la API con la sesión en cookies httpOnly. Si la respuesta es
 * 401 (access token vencido), intenta renovar UNA vez con el refresh token
 * rotativo y reintenta el request original. Si la renovación falla, devuelve
 * el 401 para que el llamador trate al usuario como deslogueado.
 *
 * Un 403 `LEGAL_NOT_ACCEPTED` avisa además al handler de
 * {@link onLegalNotAccepted}, y la respuesta le llega igual al llamador.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const options: RequestInit = { ...init, credentials: 'include' };

  let response = await fetch(url, options);
  if (response.status === 401 && (await refreshSession())) {
    response = await fetch(url, options);
  }

  await notifyIfLegalNotAccepted(response);
  return response;
}
