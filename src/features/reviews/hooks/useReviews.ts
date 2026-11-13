import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  createReview,
  deleteReviewResponse,
  dismissPendingReview,
  getModerationQueue,
  getReceivedReviews,
  getMyReviews,
  getPendingReviews,
  getProfessionalReviews,
  moderateReview,
  saveReviewResponse,
} from '../api/reviewsApi';
import type { ModerationDecision, NewReview, ReviewStatus } from '../types';

const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

const MINE = ['reviews', 'me'] as const;
const PENDING = ['reviews', 'pending'] as const;

/**
 * Paginado infinito: las páginas viven en la cache bajo el profesional, así que
 * cambiar de perfil no arrastra las reseñas del anterior, y si falla "ver más"
 * las ya cargadas se quedan.
 */
export function useProfessionalReviews(professionalId: string) {
  return useInfiniteQuery({
    queryKey: ['reviews', 'professional', professionalId],
    queryFn: ({ pageParam }) => getProfessionalReviews(professionalId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.hasMore ? ultima.page + 1 : undefined),
    retry: retryServerErrorsOnly,
  });
}

export function useMyReviews(enabled = true) {
  return useQuery({ queryKey: MINE, queryFn: getMyReviews, enabled, retry: retryServerErrorsOnly });
}

export function useCreateReview(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (review: NewReview) => createReview(appointmentId, review),
    // Sin reintento: una reseña por turno, y el segundo envío daría 409.
    retry: false,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MINE }),
        // La reseñada deja de estar pendiente (ENG-190).
        queryClient.invalidateQueries({ queryKey: PENDING }),
      ]),
  });
}

/** Turnos que falta reseñar (ENG-190). */
export function usePendingReviews(enabled = true) {
  return useQuery({
    queryKey: PENDING,
    queryFn: getPendingReviews,
    enabled,
    // Cambia poco y las mutaciones ya la invalidan: no hace falta repedirla en
    // cada navegación entre el panel y el detalle (review de #76).
    staleTime: 60_000,
    retry: retryServerErrorsOnly,
  });
}

/** Descarta el pedido de un turno. Lo saca de la lista en el momento. */
export function useDismissPendingReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissPendingReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PENDING }),
  });
}

export function useModerationQueue(status: ReviewStatus, page: number) {
  return useQuery({
    queryKey: ['reviews', 'moderation', status, page],
    queryFn: () => getModerationQueue(status, page),
    // La página anterior se mantiene solo al paginar dentro de la misma pestaña:
    // al cambiar de estado se mostrarían reseñas de otra pestaña con sus acciones.
    placeholderData: (previa, consultaPrevia) =>
      consultaPrevia?.queryKey[2] === status ? previa : undefined,
    retry: retryServerErrorsOnly,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ModerationDecision }) =>
      moderateReview(id, decision),
    retry: false,
    // También si falla: si otro moderador ya la decidió, la lista queda al día.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reviews', 'moderation'] }),
  });
}

const RECEIVED = ['reviews', 'received'] as const;

/** Las reseñas que recibió el profesional, de a páginas (ENG-106). */
export function useReceivedReviews() {
  return useInfiniteQuery({
    queryKey: RECEIVED,
    queryFn: ({ pageParam }) => getReceivedReviews(pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.hasMore ? ultima.page + 1 : undefined),
    retry: retryServerErrorsOnly,
  });
}

/**
 * Guardar o borrar una respuesta refresca las recibidas y también el perfil
 * público, donde la respuesta se ve.
 */
function useInvalidateResponses() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: RECEIVED }),
      queryClient.invalidateQueries({ queryKey: ['reviews', 'professional'] }),
    ]);
}

export function useSaveReviewResponse(reviewId: string) {
  const invalidate = useInvalidateResponses();
  return useMutation({
    mutationFn: (content: string) => saveReviewResponse(reviewId, content),
    onSuccess: invalidate,
  });
}

export function useDeleteReviewResponse(reviewId: string) {
  const invalidate = useInvalidateResponses();
  return useMutation({
    mutationFn: () => deleteReviewResponse(reviewId),
    onSuccess: invalidate,
  });
}
