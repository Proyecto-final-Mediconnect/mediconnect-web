/**
 * Error de la API con su status HTTP. Sin el status no se puede distinguir "tu
 * sesión venció" (401 → al login) de "la base falló" (500 → mostrar el mensaje y
 * ofrecer reintentar), y react-query termina reintentando incluso los 401.
 *
 * Vive en `shared/` y no dentro de una feature porque lo usa más de una. La copia
 * local de `features/profile/api/apiError.ts` (ENG-48) hace exactamente esto y su
 * propio TODO pide consolidarla; se deja para el ticket que toque ese módulo, para
 * no meter un refactor de otra feature en este PR.
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

/**
 * Convierte una respuesta fallida en un `ApiError` con el mensaje del backend.
 * Nest devuelve `message` como string o como array de strings (un ítem por
 * validación que falló); las dos formas se aplanan a un solo texto legible.
 */
export async function toApiError(
  response: Response,
  fallback: string,
): Promise<ApiError> {
  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = data?.message;

  return apiError(
    response.status,
    Array.isArray(message) ? message.join(' ') : (message ?? fallback),
  );
}
