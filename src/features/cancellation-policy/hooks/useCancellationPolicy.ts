import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import { getMyCancellationPolicy, saveMyCancellationPolicy } from '../api/cancellationPolicyApi';
import type { CancellationPolicyView } from '../types/cancellationPolicy';

const POLICY_KEY = ['cancellation-policy', 'me'] as const;

/** Mismo criterio que la agenda: los 4xx no se reintentan, los 5xx una vez. */
const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

export function useMyCancellationPolicy() {
  return useQuery({
    queryKey: POLICY_KEY,
    queryFn: getMyCancellationPolicy,
    retry: retryServerErrorsOnly,
  });
}

export function useSaveCancellationPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMyCancellationPolicy,
    onSuccess: (policy: CancellationPolicyView) => queryClient.setQueryData(POLICY_KEY, policy),
  });
}
