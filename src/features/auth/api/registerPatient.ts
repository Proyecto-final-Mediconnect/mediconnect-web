import type { RegisterPatientInput, RegisterPatientResponse } from '../types/register';

import { LEGAL_VERSION } from '../../legal/legal';

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
    body: JSON.stringify(toPayload(input)),
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

/**
 * El checkbox es un booleano del formulario; al backend va la **versión** de los
 * textos aceptados (ENG-140), que es lo que queda registrado. `acceptedLegal` no
 * viaja: el backend corre con `forbidNonWhitelisted` y lo rechazaría.
 */
function toPayload(input: RegisterPatientInput) {
  return {
    email: input.email,
    password: input.password,
    passwordConfirmation: input.passwordConfirmation,
    acceptedLegalVersion: LEGAL_VERSION,
  };
}
