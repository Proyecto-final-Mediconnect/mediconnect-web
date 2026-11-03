import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type {
  ModerationDecision,
  ModerationPage,
  ModerationReview,
  MyReview,
  NewReview,
  PublicReviewPage,
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
