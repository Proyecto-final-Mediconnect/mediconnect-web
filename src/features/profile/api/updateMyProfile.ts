import type {
  ProfessionalProfile,
  ProfessionalProfileInput,
} from '../types/professionalProfile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Actualiza el perfil (bio, precio, especialidades). El precio en null se omite
 *  del payload: el backend valida `IsNumber`, así que "sin precio" = no enviarlo. */
export async function updateMyProfile(
  input: ProfessionalProfileInput,
): Promise<ProfessionalProfile> {
  const body: Record<string, unknown> = {
    bio: input.bio,
    specialtyIds: input.specialtyIds,
  };
  if (input.consultationPrice !== null) {
    body.consultationPrice = input.consultationPrice;
  }

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
    throw new Error(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo guardar tu perfil.'),
    );
  }

  return data as ProfessionalProfile;
}
