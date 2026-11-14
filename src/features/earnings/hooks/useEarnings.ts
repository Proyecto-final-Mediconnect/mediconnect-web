import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMyEarnings } from '../api/earningsApi';

/** Cobros del mes elegido. Mantiene la página anterior mientras carga la otra. */
export function useMyEarnings(from: string, to: string, pagina: number) {
  return useQuery({
    queryKey: ['earnings', from, to, pagina] as const,
    queryFn: () => getMyEarnings(from, to, pagina),
    placeholderData: keepPreviousData,
  });
}
