import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '../api/getPublicProfile';
import { ApiError } from '../../../shared/lib/httpClient';

/** Reintentos por defecto de react-query, que replicamos para el caso reintentable. */
const MAX_RETRIES = 3;

/**
 * Ningún 4xx de este endpoint se arregla insistiendo, así que no se reintenta:
 *
 * - **400** — el id no es un UUID (`ParseUUIDPipe` en el backend). Pasa con un
 *   enlace cortado al compartirlo o una URL escrita a mano.
 * - **404** — no existe, o el profesional no está VALIDADO.
 * - **429** — rate limit del `ThrottlerGuard` global, con ventana de 60s: los
 *   ~7s de backoff de react-query no alcanzan para que se libere, así que
 *   reintentar solo alarga el spinner. El usuario puede reintentar a mano.
 *
 * Los 5xx y los errores de red sí se reintentan, que es donde el reintento sirve.
 */
export function shouldRetryPublicProfile(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

/**
 * Para el usuario, un id malformado (400) y un profesional inexistente o no
 * validado (404) son el mismo caso: el perfil que buscaba no está.
 *
 * El resto de los 4xx NO entra acá a propósito. Un 429 mostrando "no
 * encontramos este profesional" sería mentira, y ahí el botón de reintentar sí
 * tiene sentido: basta con esperar.
 */
export function isMissingProfileError(error: Error | null): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 404);
}

/** Perfil público de un profesional (ENG-50). */
export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['catalog', 'professional', id],
    queryFn: () => getPublicProfile(id),
    retry: shouldRetryPublicProfile,
  });
}
