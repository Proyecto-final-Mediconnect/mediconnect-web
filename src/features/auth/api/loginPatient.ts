import type { LoginInput, LoginResponse } from '../types/login';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export async function loginPatient(input: LoginInput): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // recibe la cookie de sesión httpOnly
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => null)) as
    | (LoginResponse & { message?: string | string[] })
    | null;

  if (!response.ok) {
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo iniciar sesión. Intentá de nuevo.'),
    );
  }

  return data as LoginResponse;
}
