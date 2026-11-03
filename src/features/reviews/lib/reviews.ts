import type { RatingSummary, ReviewStatus } from '../types';

/** "4,7": con coma, como se escribe en castellano. */
export function formatAverage(average: number): string {
  return average.toFixed(1).replace('.', ',');
}

/** "4,7 · 12 reseñas", o "Sin reseñas todavía". */
export function ratingLabel(rating: RatingSummary | null | undefined): string {
  if (!rating || rating.count === 0) return 'Sin reseñas todavía';
  return `${formatAverage(rating.average)} · ${rating.count} ${rating.count === 1 ? 'reseña' : 'reseñas'}`;
}

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDIENTE_MODERACION: 'En revisión',
  APROBADA: 'Publicada',
  RECHAZADA: 'No publicada',
};

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatReviewDate(iso: string): string {
  return FECHA.format(new Date(iso));
}
