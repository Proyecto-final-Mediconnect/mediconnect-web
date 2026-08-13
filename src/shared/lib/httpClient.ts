const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  fallbackMessage?: string;
};

/**
 * Cliente HTTP compartido para el backend de MediConnect.
 * Manda `credentials: 'include'` siempre: la sesión viaja en cookies
 * httpOnly (sb-access-token/sb-refresh-token) y el browser solo las
 * adjunta/guarda si el request las pide explícitamente.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, fallbackMessage }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data as { message?: string | string[] } | null)
      ?.message;
    throw new ApiError(
      response.status,
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? fallbackMessage ?? 'Ocurrió un error inesperado. Intentá de nuevo.'),
    );
  }

  return data as T;
}
