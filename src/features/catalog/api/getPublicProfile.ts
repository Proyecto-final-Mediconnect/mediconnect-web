import { apiRequest } from '../../../shared/lib/httpClient';
import type { PublicProfessionalProfile } from '../types/catalog';

/**
 * Perfil público de un profesional (ENG-50). Ruta abierta: no requiere sesión.
 *
 * El backend responde 404 tanto si el id no existe como si el profesional no
 * está VALIDADO, y es deliberado: no filtra la existencia de una matrícula
 * pendiente o rechazada. Para la UI las dos cosas son el mismo caso.
 */
export function getPublicProfile(id: string): Promise<PublicProfessionalProfile> {
  return apiRequest<PublicProfessionalProfile>(`/professionals/${id}`, {
    fallbackMessage: 'No pudimos cargar el perfil. Intentá de nuevo.',
  });
}
