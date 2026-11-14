import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMyStats } from '../api/statsApi';

/** Actividad del período elegido. Mantiene la vista anterior mientras carga la otra. */
export function useMyStats(from: string, to: string) {
  return useQuery({
    queryKey: ['professional-stats', from, to] as const,
    queryFn: () => getMyStats(from, to),
    placeholderData: keepPreviousData,
  });
}
