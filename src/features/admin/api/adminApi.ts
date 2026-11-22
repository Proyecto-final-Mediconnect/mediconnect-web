import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { ProfessionalStats } from '../../activity/types';

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

/** Los estados de un profesional (ENG-241). */
export type ProfessionalStatus =
  | 'PENDIENTE_VALIDACION_MATRICULA'
  | 'VALIDADO'
  | 'RECHAZADO'
  | 'SUSPENDIDO';

/** Un profesional en el listado del administrador (ENG-241). */
export interface AdminProfessionalRow {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  specialties: string[];
  status: ProfessionalStatus;
  registeredAt: string;
  /** Los últimos 3 meses; la calificación es de todas sus reseñas publicadas. */
  activity: { completed: number; incidents: number; rating: number | null; reviews: number };
}

export interface AdminProfessionalPage {
  items: AdminProfessionalRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** El detalle de un profesional, con la actividad de "Mi actividad". */
export interface AdminProfessionalDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  licenseNumber: string;
  specialties: string[];
  status: ProfessionalStatus;
  registeredAt: string;
  consultationPrice: number | null;
  currency: string;
  stats: ProfessionalStats;
}

/** Lo que resolvería suspenderlo: turnos pagados a reembolsar e impagos a cancelar. */
export interface SuspensionImpact {
  paid: number;
  unpaid: number;
}

export interface ProfessionalsFilter {
  status?: ProfessionalStatus;
  q?: string;
  page?: number;
}

/** `GET /admin/professionals?status=&q=&page=` (ENG-241). */
export async function getAdminProfessionals(
  filter: ProfessionalsFilter,
): Promise<AdminProfessionalPage> {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  const query = params.toString();
  const response = await apiFetch(`/admin/professionals${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar los profesionales.');
  }
  return (await response.json()) as AdminProfessionalPage;
}

/** `GET /admin/professionals/:id` (ENG-241). */
export async function getAdminProfessional(id: string): Promise<AdminProfessionalDetail> {
  const response = await apiFetch(`/admin/professionals/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar el profesional.');
  }
  return (await response.json()) as AdminProfessionalDetail;
}

/** `GET /admin/professionals/:id/suspension-preview` (ENG-241). */
export async function getSuspensionPreview(id: string): Promise<SuspensionImpact> {
  const response = await apiFetch(
    `/admin/professionals/${encodeURIComponent(id)}/suspension-preview`,
  );
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos calcular qué turnos se verían afectados.');
  }
  return (await response.json()) as SuspensionImpact;
}

/** `PATCH /admin/professionals/:id/suspension` o `/reactivation` (ENG-241). */
export async function changeAccountStatus(
  id: string,
  action: 'suspension' | 'reactivation',
  reason: string,
): Promise<{ id: string; status: ProfessionalStatus; refunded?: number; cancelled?: number }> {
  const response = await apiFetch(`/admin/professionals/${encodeURIComponent(id)}/${action}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw await toApiError(
      response,
      action === 'suspension'
        ? 'No pudimos suspender al profesional. Probá de nuevo.'
        : 'No pudimos reactivar al profesional. Probá de nuevo.',
    );
  }
  return (await response.json()) as {
    id: string;
    status: ProfessionalStatus;
    refunded?: number;
    cancelled?: number;
  };
}

/** La última verificación de la cadena de hash de la historia clínica (ENG-85). */
export interface IntegritySummary {
  at: string;
  /** `OK`, `INCONSISTENT`, `ANCHOR_REGRESSION` o `ERROR`. */
  status: string;
  inconsistencies: number;
  patientsChecked: number | null;
  entriesChecked: number | null;
}

/** Las métricas de la plataforma (ENG-195): solo agregados, nunca datos de una persona. */
export interface PlatformStats {
  from: string;
  to: string;
  usuarios: { pacientes: number; profesionales: number; nuevos: number };
  profesionales: {
    validados: number;
    pendientes: number;
    rechazados: number;
    suspendidos: number;
    porEspecialidad: { especialidad: string; profesionales: number }[];
  };
  turnos: {
    total: number;
    completados: number;
    cancelados: number;
    noAsistio: number;
    liberados: number;
    pendientes: number;
    porMes: { mes: string; turnos: number; completados: number }[];
  };
  cobros: { moneda: 'ARS'; cobrado: number; reembolsado: number; neto: number; pagos: number };
  resenas: { cantidad: number; promedio: number | null };
  integridad: IntegritySummary | null;
}

/** `GET /admin/stats?from=&to=` (ENG-195). */
export async function getPlatformStats(range: {
  from: string;
  to: string;
}): Promise<PlatformStats> {
  const params = new URLSearchParams(range);
  const response = await apiFetch(`/admin/stats?${params.toString()}`);
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar las métricas de la plataforma.');
  }
  return (await response.json()) as PlatformStats;
}
