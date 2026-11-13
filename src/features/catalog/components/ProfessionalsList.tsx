import { Button } from '../../../shared/ui/Button';
import { useInfiniteScrollSentinel } from '../hooks/useInfiniteScrollSentinel';
import type { ProfessionalCard } from '../types/catalog';
import { ProfessionalCardItem } from './ProfessionalCardItem';

type Props = {
  /** Raíz de los enlaces a cada perfil: cambia según el marco (público o app). */
  basePath: string;
  professionals: ProfessionalCard[];
  total: number;
  isLoading: boolean;
  isFiltering: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** Hay algún filtro aplicado: cambia el mensaje del estado vacío. */
  hasFilters: boolean;
};

export function ProfessionalsList({
  basePath,
  professionals,
  total,
  isLoading,
  isFiltering,
  isError,
  errorMessage,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  hasFilters,
}: Props) {
  const sentinelRef = useInfiniteScrollSentinel({
    hasNextPage,
    isFetching: isFetchingNextPage,
    onIntersect: onLoadMore,
  });

  if (isLoading) {
    return (
      <p className="py-16 text-center text-muted" role="status">
        Buscando profesionales…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-8 text-center">
        <p className="text-ink">{errorMessage ?? 'No pudimos cargar el catálogo.'}</p>
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-strong bg-white p-10 text-center">
        <p className="text-lg font-semibold text-brand-deep">No encontramos profesionales</p>
        <p className="mt-2 text-muted">
          {hasFilters
            ? 'Ningún profesional coincide con los filtros que aplicaste. Probá ampliar el rango de precio o elegir otra especialidad.'
            : 'Todavía no hay profesionales verificados en el catálogo. Volvé a intentarlo más tarde.'}
        </p>
      </div>
    );
  }

  return (
    <div aria-busy={isFiltering}>
      {/* aria-live: al refiltrar, un lector de pantalla anuncia cuántos
          resultados quedaron sin que el usuario tenga que recorrer la lista. */}
      <p
        className="mb-4 text-sm font-medium text-muted"
        role="status"
        aria-live="polite"
      >
        {total === 1 ? '1 profesional disponible' : `${total} profesionales disponibles`}
      </p>

      {/* Una sola columna, a diferencia del grid de dos que había: la tarjeta
          del canvas es ancha y tiene su propia columna de decisión a la
          derecha, así que apilarlas de a dos la comprime y rompe esa lectura. */}
      <ul className="grid gap-3.5">
        {professionals.map((professional) => (
          <ProfessionalCardItem
            key={professional.id}
            professional={professional}
            basePath={basePath}
          />
        ))}
      </ul>

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={onLoadMore}>
            {isFetchingNextPage ? 'Cargando…' : 'Ver más profesionales'}
          </Button>
        </div>
      )}
    </div>
  );
}
