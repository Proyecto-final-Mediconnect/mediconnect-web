import type { ProfessionalProfile } from '../types/professionalProfile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Perfil del profesional autenticado. La sesión viaja en la cookie httpOnly,
 *  por eso `credentials: 'include'`. */
export async function getMyProfile(): Promise<ProfessionalProfile> {
  const response = await fetch(`${API_BASE_URL}/professionals/me`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo cargar tu perfil.'),
    );
  }

  return (await response.json()) as ProfessionalProfile;
}
