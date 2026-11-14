import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMyEarnings } from '../api/earningsApi';
import type { EarningsFilters } from '../types';

/** Cobros del período y filtros elegidos. Mantiene la vista anterior mientras carga la otra. */
export function useMyEarnings(
  from: string,
  to: string,
  pagina: number,
  filtros: EarningsFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ['earnings', from, to, pagina, filtros] as const,
    queryFn: () => getMyEarnings(from, to, pagina, filtros),
    placeholderData: keepPreviousData,
    enabled,
  });
}
