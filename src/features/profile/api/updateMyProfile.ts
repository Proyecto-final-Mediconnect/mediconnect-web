import type {
  ProfessionalProfile,
  ProfessionalProfileInput,
} from '../types/professionalProfile';
import { apiError } from './apiError';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Actualiza el perfil (bio, precio, especialidades).
 *
 * El precio en `null` se manda EXPLÍCITO, no se omite: para el backend omitir un
 * campo es "no lo toques" (solo escribe los `!== undefined`), así que omitirlo
 * dejaba el precio anterior publicado mientras la UI decía "Perfil guardado ✓".
 * Mandar null lo borra (ver el DTO en mediconnect-backend, ENG-48).
 */
export async function updateMyProfile(
  input: ProfessionalProfileInput,
): Promise<ProfessionalProfile> {
  const body: Record<string, unknown> = {
    bio: input.bio,
    specialtyIds: input.specialtyIds,
    consultationPrice: input.consultationPrice,
  };

  const response = await fetch(`${API_BASE_URL}/professionals/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | (ProfessionalProfile & { message?: string | string[] })
    | null;

  if (!response.ok) {
    const message = data?.message;
    throw apiError(
      response.status,
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo guardar tu perfil.'),
    );
  }

  return data as ProfessionalProfile;
}
