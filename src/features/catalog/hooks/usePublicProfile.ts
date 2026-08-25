import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '../api/getPublicProfile';
import { ApiError } from '../../../shared/lib/httpClient';

/** Reintentos por defecto de react-query, que replicamos para el caso no-404. */
const MAX_RETRIES = 3;

/**
 * No reintenta ante un 404: si el profesional no existe o no está validado,
 * insistir no cambia la respuesta y solo demora el mensaje al usuario. El resto
 * de los errores (red, 5xx) sí se reintentan.
 *
 * Se exporta para poder testear la política sin montar la query.
 */
export function shouldRetryPublicProfile(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status === 404) return false;
  return failureCount < MAX_RETRIES;
}

/** Perfil público de un profesional (ENG-50). */
export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['catalog', 'professional', id],
    queryFn: () => getPublicProfile(id),
    retry: shouldRetryPublicProfile,
  });
}
