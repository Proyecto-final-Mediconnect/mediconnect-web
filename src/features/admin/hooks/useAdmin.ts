import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeAccountStatus,
  decideLicense,
  getAdminProfessional,
  getAdminProfessionals,
  getAdminProfile,
  getLicenseQueue,
  getPlatformStats,
  getSuspensionPreview,
  type LicenseDecision,
  type LicenseQueueStatus,
  type ProfessionalsFilter,
} from '../api/adminApi';

const LICENSES_KEY = ['admin', 'licenses'] as const;
const PROFESSIONALS_KEY = ['admin', 'professionals'] as const;

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

/** El listado de profesionales (ENG-241). */
export function useAdminProfessionals(filter: ProfessionalsFilter) {
  return useQuery({
    queryKey: [...PROFESSIONALS_KEY, 'list', filter],
    queryFn: () => getAdminProfessionals(filter),
    retry: false,
    // Al cambiar de página o de filtro se sigue viendo la anterior hasta que llega la nueva.
    placeholderData: (previous) => previous,
  });
}

/** El detalle de un profesional (ENG-241). */
export function useAdminProfessional(id: string) {
  return useQuery({
    queryKey: [...PROFESSIONALS_KEY, 'detail', id],
    queryFn: () => getAdminProfessional(id),
    retry: false,
  });
}

/** Lo que resolvería suspenderlo. Se pide recién al abrir el diálogo. */
export function useSuspensionPreview(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...PROFESSIONALS_KEY, 'suspension-preview', id],
    queryFn: () => getSuspensionPreview(id),
    enabled,
    retry: false,
    // Los turnos cambian: cada vez que se abre el diálogo, el número de ahora.
    staleTime: 0,
    gcTime: 0,
  });
}

/** Suspender o reactivar. Al terminar se vuelven a pedir el listado, el detalle y las matrículas. */
export function useChangeAccountStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: 'suspension' | 'reactivation'; reason: string }) =>
      changeAccountStatus(input.id, input.action, input.reason),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFESSIONALS_KEY }),
        queryClient.invalidateQueries({ queryKey: LICENSES_KEY }),
      ]),
  });
}

/** Las métricas de la plataforma de un período (ENG-195). */
export function usePlatformStats(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'stats', range.from, range.to],
    queryFn: () => getPlatformStats(range),
    retry: false,
    placeholderData: (previous) => previous,
  });
}
