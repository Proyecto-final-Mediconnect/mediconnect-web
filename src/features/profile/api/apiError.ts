/**
 * Los errores de la API llevan el status HTTP además del mensaje: sin eso no se
 * puede distinguir "tu sesión venció" (401 → hay que ir al login) de "la base
 * falló" (500 → mostrar el mensaje y ofrecer reintentar). Antes todo llegaba como
 * un `Error` pelado y react-query reintentaba incluso los 401.
 *
 * TODO(ENG-44): reemplazar por `shared/api/apiFetch` (mediconnect-web#11), que trae
 * el cliente HTTP compartido con esta misma idea. Esto es el mínimo local para no
 * dejar una tercera implementación del mismo wrapper dando vueltas.
 */
export type ApiError = Error & { status: number };

export function apiError(status: number, message: string): ApiError {
  return Object.assign(new Error(message), { status });
}

/** Un 4xx no se arregla reintentando (el 401 menos que ninguno). */
export function isClientError(error: unknown): boolean {
  const status = (error as Partial<ApiError> | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export function isUnauthorized(error: unknown): boolean {
  return (error as Partial<ApiError> | null)?.status === 401;
}
