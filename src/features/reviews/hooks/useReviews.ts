import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  createReview,
  getModerationQueue,
  getMyReviews,
  getProfessionalReviews,
  moderateReview,
} from '../api/reviewsApi';
import type { ModerationDecision, NewReview, ReviewStatus } from '../types';

const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

const MINE = ['reviews', 'me'] as const;

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINE }),
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
