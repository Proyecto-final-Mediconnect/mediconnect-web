import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { InAppInbox } from '../types/notification';

/** `GET /notifications/me`: la bandeja de avisos in-app (ENG-69). */
export async function getMyNotifications(): Promise<InAppInbox> {
  const response = await apiFetch('/notifications/me');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus avisos.');
  return (await response.json()) as InAppInbox;
}

/** `PATCH /notifications/:id/read`: marca un aviso propio como leído. */
export async function markNotificationRead(id: string): Promise<void> {
  const response = await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos marcar el aviso como leído.');
}
