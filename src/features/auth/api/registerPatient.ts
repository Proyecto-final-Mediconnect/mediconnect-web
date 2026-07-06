import type {
  RegisterPatientInput,
  RegisterPatientResponse,
} from '../types/register';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Llama al endpoint de registro del backend (NestJS).
 * El backend orquesta el signUp contra Supabase y responde un mensaje
 * genérico (no revela si el email ya estaba registrado).
 */
export async function registerPatient(
  input: RegisterPatientInput,
): Promise<RegisterPatientResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => null)) as
    | (RegisterPatientResponse & { message?: string | string[] })
    | null;

  if (!response.ok) {
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo completar el registro. Intentá de nuevo.'),
    );
  }

  return data as RegisterPatientResponse;
}
