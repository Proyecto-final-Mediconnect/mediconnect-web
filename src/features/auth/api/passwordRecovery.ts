import type {
  ForgotPasswordInput,
  PasswordRecoveryResponse,
  ResetPasswordInput,
} from '../types/passwordRecovery';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function post(
  path: string,
  body: unknown,
  fallback: string,
): Promise<PasswordRecoveryResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
    // El 429 es del throttle del backend: su mensaje ("ThrottlerException…")
    // no le sirve a nadie.
    if (response.status === 429) {
      throw new Error('Hiciste muchos pedidos seguidos. Esperá un minuto y probá de nuevo.');
    }
    const message = data?.message;
    throw new Error(Array.isArray(message) ? message.join(' ') : (message ?? fallback));
  }

  return data as PasswordRecoveryResponse;
}

/**
 * Pide el mail con el enlace para elegir una contraseña nueva (ENG-142). El
 * backend responde lo mismo exista o no la cuenta.
 */
export function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<PasswordRecoveryResponse> {
  return post('/auth/password/forgot', input, 'No pudimos enviar el enlace. Intentá de nuevo.');
}

/** Cambia la contraseña con el `token_hash` del enlace del mail. */
export function resetPassword(input: ResetPasswordInput): Promise<PasswordRecoveryResponse> {
  return post('/auth/password/reset', input, 'No pudimos cambiar la contraseña. Intentá de nuevo.');
}
