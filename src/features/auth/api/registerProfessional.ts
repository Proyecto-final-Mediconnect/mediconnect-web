import type {
  RegisterProfessionalInput,
  RegisterProfessionalResponse,
} from '../types/registerProfessional';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Llama al endpoint de registro de profesional del backend (NestJS).
 * El backend orquesta el signUp contra Supabase con los datos profesionales y
 * responde un mensaje genérico (no revela si el email ya estaba registrado).
 */
export async function registerProfessional(
  input: RegisterProfessionalInput,
): Promise<RegisterProfessionalResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register/professional`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => null)) as
    | (RegisterProfessionalResponse & { message?: string | string[] })
    | null;

  if (!response.ok) {
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo completar el registro. Intentá de nuevo.'),
    );
  }

  return data as RegisterProfessionalResponse;
}
