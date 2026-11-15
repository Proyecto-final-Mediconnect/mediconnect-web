/**
 * Reseñas de profesionales (ENG-80, ENG-82): el contrato de backend#92.
 */

/** Las nuevas nacen APROBADA (no hay moderación); PENDIENTE_MODERACION y
 *  RECHAZADA quedan solo en reseñas viejas. */
export type ReviewStatus = 'PENDIENTE_MODERACION' | 'APROBADA' | 'RECHAZADA';

/** Promedio de las reseñas aprobadas. El backend manda `null` si no hay. */
export interface RatingSummary {
  average: number;
  count: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  /** "Julián S." */
  author: string;
  createdAt: string;
  response: { content: string; createdAt: string } | null;
}

export interface PublicReviewPage {
  reviews: PublicReview[];
  rating: RatingSummary | null;
  page: number;
  hasMore: boolean;
}

export interface MyReview {
  id: string;
  appointmentId: string;
  professionalId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  moderationReason: string | null;
  createdAt: string;
}

export interface NewReview {
  rating: number;
  comment?: string;
}

/** La respuesta pública de un profesional a una reseña (ENG-106). */
export interface ReviewResponse {
  reviewId: string;
  content: string;
  createdAt: string;
}

/** Un turno que el paciente puede reseñar y todavía no reseñó (ENG-190). */
export interface PendingReview {
  appointmentId: string;
  scheduledAt: string;
  professional: { id: string; firstName: string; lastName: string; photoUrl: string | null };
}
