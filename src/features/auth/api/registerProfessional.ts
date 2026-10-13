import type {
  RegisterProfessionalInput,
  RegisterProfessionalResponse,
} from '../types/registerProfessional';

import { LEGAL_VERSION } from '../../legal/legal';

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
    body: JSON.stringify(toPayload(input)),
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

/**
 * El checkbox es un booleano del formulario; al backend va la **versión** de los
 * textos aceptados (ENG-140), que es lo que queda registrado. `acceptedLegal` no
 * viaja: el backend corre con `forbidNonWhitelisted` y lo rechazaría.
 */
function toPayload(input: RegisterProfessionalInput) {
  return {
    email: input.email,
    password: input.password,
    passwordConfirmation: input.passwordConfirmation,
    firstName: input.firstName,
    lastName: input.lastName,
    specialty: input.specialty,
    licenseNumber: input.licenseNumber,
    acceptedLegalVersion: LEGAL_VERSION,
  };
}
