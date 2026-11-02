import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useProfessionalReviews(professionalId: string, page: number) {
  return useQuery({
    queryKey: ['reviews', 'professional', professionalId, page],
    queryFn: () => getProfessionalReviews(professionalId, page),
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnly,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ModerationDecision }) =>
      moderateReview(id, decision),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews', 'moderation'] }),
  });
}
