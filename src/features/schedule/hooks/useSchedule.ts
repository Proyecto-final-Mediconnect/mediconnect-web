import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  createBlock,
  deleteBlock,
  getMySchedule,
  saveMySchedule,
} from '../api/scheduleApi';
import type { Schedule } from '../types/schedule';

const SCHEDULE_KEY = ['schedule', 'me'] as const;

/** Mismo criterio que `useProfile`: los 4xx no se reintentan, los 5xx una vez. */
const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

export function useMySchedule() {
  return useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: getMySchedule,
    retry: retryServerErrorsOnly,
  });
}

/** Guarda la agenda y refresca la caché con lo que devolvió el backend (que trae
 *  los `id` recién generados de cada franja). */
export function useSaveSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMySchedule,
    onSuccess: (schedule: Schedule) =>
      queryClient.setQueryData(SCHEDULE_KEY, schedule),
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBlock,
    // El POST devuelve solo el bloqueo creado, no la agenda entera: se invalida
    // para que la lista se reordene por fecha del lado del servidor.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY }),
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY }),
  });
}
