import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decideLicense,
  getAdminProfile,
  getLicenseQueue,
  type LicenseDecision,
  type LicenseQueueStatus,
} from '../api/adminApi';

const LICENSES_KEY = ['admin', 'licenses'] as const;

/** El administrador que entra al panel (ENG-240). */
export function useAdminProfile() {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: getAdminProfile,
    retry: false,
  });
}

/** La cola de matrículas en un estado (ENG-192). */
export function useLicenseQueue(status: LicenseQueueStatus) {
  return useQuery({
    queryKey: [...LICENSES_KEY, status],
    queryFn: () => getLicenseQueue(status),
    retry: false,
  });
}

/**
 * Valida o rechaza una matrícula. Al terminar se vuelven a pedir las tres
 * pestañas: el profesional sale de pendientes y entra en otra.
 */
export function useDecideLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { professionalId: string; decision: LicenseDecision; reason?: string }) =>
      decideLicense(input.professionalId, input.decision, input.reason),
    onSettled: () => queryClient.invalidateQueries({ queryKey: LICENSES_KEY }),
  });
}
