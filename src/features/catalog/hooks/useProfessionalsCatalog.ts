import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listProfessionals } from '../api/listProfessionals';
import type { CatalogFilters, ProfessionalCard } from '../types/catalog';

/**
 * Listado del catálogo con scroll infinito. Los filtros forman parte de la
 * queryKey: al cambiarlos, React Query arranca una lista nueva desde la
 * página 1 sin que la página se recargue, y conserva en caché los resultados
 * de los filtros anteriores.
 */
export function useProfessionalsCatalog(filters: CatalogFilters) {
  const query = useInfiniteQuery({
    queryKey: ['catalog', 'professionals', filters],
    queryFn: ({ pageParam }) => listProfessionals(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    // Mantiene la lista anterior en pantalla mientras llega la filtrada, en
    // vez de parpadear a vacío en cada tecla del filtro de precio.
    placeholderData: (previous) => previous,
    retry: false,
  });

  const professionals: ProfessionalCard[] = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  return {
    professionals,
    total: query.data?.pages[0]?.meta.total ?? 0,
    // `isLoading` es false al refiltrar (hay placeholder), así que el estado
    // "no hay resultados" se decide con datos ya resueltos.
    isLoading: query.isLoading,
    isFiltering: query.isPlaceholderData,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
