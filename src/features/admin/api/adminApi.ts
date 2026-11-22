import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';

/** Quién administra, como lo devuelve `GET /admin/me` (ENG-240). */
export interface AdminProfile {
  id: string;
  email: string;
  role: 'ADMINISTRADOR';
}

/**
 * `GET /admin/me`: confirma con el backend que la sesión es de un
 * administrador. El rol que tiene la web en memoria sirve para el menú; el que
 * decide es el backend, que lo lee de `profiles`.
 */
export async function getAdminProfile(): Promise<AdminProfile> {
  const response = await apiFetch('/admin/me');
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos abrir el panel de administración.');
  }
  return (await response.json()) as AdminProfile;
}
