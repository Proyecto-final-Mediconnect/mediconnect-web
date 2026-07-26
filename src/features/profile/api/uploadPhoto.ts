import type { ProfessionalProfile } from '../types/professionalProfile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Sube la foto de perfil (ya comprimida en el cliente) como multipart/form-data.
 *  No seteamos Content-Type a mano: el browser agrega el boundary correcto. */
export async function uploadPhoto(file: File): Promise<ProfessionalProfile> {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${API_BASE_URL}/professionals/me/photo`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as
    | (ProfessionalProfile & { message?: string | string[] })
    | null;

  if (!response.ok) {
    const message = data?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'No se pudo subir la foto.'),
    );
  }

  return data as ProfessionalProfile;
}
