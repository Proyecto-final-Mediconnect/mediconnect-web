import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type {
  ModerationDecision,
  ModerationPage,
  ModerationReview,
  MyReview,
  NewReview,
  PendingReview,
  PublicReviewPage,
  ReviewResponse,
  ReviewStatus,
} from '../types';

async function json<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw await toApiError(response, fallback);
  return (await response.json()) as T;
}

/** Las aprobadas de un profesional. Es público: no hace falta sesión. */
export async function getProfessionalReviews(
  professionalId: string,
  page: number,
): Promise<PublicReviewPage> {
  const response = await apiFetch(
    `/professionals/${encodeURIComponent(professionalId)}/reviews?page=${page}`,
  );
  return json(response, 'No pudimos cargar las reseñas.');
}

export async function getMyReviews(): Promise<MyReview[]> {
  return json(await apiFetch('/reviews/me'), 'No pudimos cargar tus reseñas.');
}

export async function createReview(appointmentId: string, review: NewReview): Promise<MyReview> {
  const response = await apiFetch(`/appointments/${encodeURIComponent(appointmentId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  return json(response, 'No pudimos guardar la reseña.');
}

export async function getModerationQueue(
  status: ReviewStatus,
  page: number,
): Promise<ModerationPage> {
  const response = await apiFetch(`/moderation/reviews?status=${status}&page=${page}`);
  return json(response, 'No pudimos cargar las reseñas.');
}

export async function moderateReview(
  reviewId: string,
  decision: ModerationDecision,
): Promise<ModerationReview> {
  const response = await apiFetch(`/moderation/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision),
  });
  return json(response, 'No pudimos guardar la decisión.');
}

/** Las reseñas publicadas que recibió el profesional, con sus respuestas (ENG-106). */
export async function getReceivedReviews(page: number): Promise<PublicReviewPage> {
  return json(await apiFetch(`/reviews/received?page=${page}`), 'No pudimos cargar tus reseñas.');
}

/** Responde una reseña propia, o cambia la respuesta que ya tenía (ENG-106). */
export async function saveReviewResponse(
  reviewId: string,
  content: string,
): Promise<ReviewResponse> {
  const response = await apiFetch(`/reviews/${encodeURIComponent(reviewId)}/response`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return json(response, 'No pudimos guardar la respuesta.');
}

export async function deleteReviewResponse(reviewId: string): Promise<void> {
  const response = await apiFetch(`/reviews/${encodeURIComponent(reviewId)}/response`, {
    method: 'DELETE',
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos borrar la respuesta.');
}

/** Turnos que falta reseñar, para la tarjeta del inicio (ENG-190). */
export async function getPendingReviews(): Promise<PendingReview[]> {
  return json(
    await apiFetch('/reviews/pending'),
    'No pudimos cargar tus consultas para calificar.',
  );
}

/** Descarta el pedido de reseña de un turno: no vuelve en ningún dispositivo. */
export async function dismissPendingReview(appointmentId: string): Promise<void> {
  const response = await apiFetch(`/reviews/pending/${encodeURIComponent(appointmentId)}/dismiss`, {
    method: 'POST',
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos ocultar el pedido.');
}
