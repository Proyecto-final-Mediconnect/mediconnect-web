import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';

/** Quién administra, como lo devuelve `GET /admin/me` (ENG-240). */
export interface AdminProfile {
  id: string;
  email: string;
  role: 'ADMINISTRADOR';
}

/** Los estados de la cola de matrículas (ENG-192). */
export type LicenseQueueStatus = 'PENDIENTE_VALIDACION_MATRICULA' | 'VALIDADO' | 'RECHAZADO';

/** Un profesional en la cola de matrículas, como lo devuelve el backend. */
export interface LicenseQueueItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  licenseNumber: string;
  specialties: string[];
  /** ISO-8601: cuándo se registró. */
  registeredAt: string;
  status: LicenseQueueStatus;
  /** La última decisión, o `null` en un pendiente o en uno validado antes del panel. */
  decision: { at: string; reason: string | null } | null;
}

export type LicenseDecision = 'VALIDADO' | 'RECHAZADO';

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

/** `GET /admin/professionals/licenses?status=…` (ENG-192). */
export async function getLicenseQueue(status: LicenseQueueStatus): Promise<LicenseQueueItem[]> {
  const response = await apiFetch(
    `/admin/professionals/licenses?status=${encodeURIComponent(status)}`,
  );
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar las matrículas.');
  }
  return (await response.json()) as LicenseQueueItem[];
}

/** `PATCH /admin/professionals/:id/license` (ENG-192): validar o rechazar. */
export async function decideLicense(
  professionalId: string,
  decision: LicenseDecision,
  reason?: string,
): Promise<{ id: string; status: LicenseDecision }> {
  const response = await apiFetch(
    `/admin/professionals/${encodeURIComponent(professionalId)}/license`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason ? { decision, reason } : { decision }),
    },
  );
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos guardar la decisión. Probá de nuevo.');
  }
  return (await response.json()) as { id: string; status: LicenseDecision };
}
