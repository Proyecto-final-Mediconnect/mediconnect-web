import { useState } from 'react';
import { CatalogFiltersPanel } from './CatalogFiltersPanel';
import { CatalogSearchBox } from './CatalogSearchBox';
import { ProfessionalsList } from './ProfessionalsList';
import { useProfessionalsCatalog } from '../hooks/useProfessionalsCatalog';
import { validatePriceRange } from '../lib/priceRange';
import { EMPTY_FILTERS, hasAnyFilter, type CatalogFilters } from '../types/catalog';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';

/**
 * El catálogo en sí: filtros, buscador y resultados, sin ninguna cabecera.
 *
 * Vive aparte porque **el mismo catálogo se muestra en dos marcos distintos**.
 * Con sesión abierta se entra desde el menú lateral y tiene que quedarse dentro
 * de la app; sin sesión es una página pública con su propio encabezado y sus
 * botones de ingresar. Antes era una sola página con el marco público adentro, y
 * un paciente logueado que apretaba "Buscar profesionales" salía de la app.
 *
 * `basePath` es lo que hace que los enlaces de cada tarjeta se queden en el marco
 * donde uno está: `/profesionales/:id` desde la pública, `/buscar/:id` desde la
 * privada. Un enlace fijo devolvería al usuario al otro marco a mitad del
 * recorrido.
 */
type CatalogViewProps = {
  /** Raíz de los enlaces a cada perfil. Sin barra final. */
  basePath: string;
};

export function CatalogView({ basePath }: CatalogViewProps) {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const priceRangeError = validatePriceRange(filters);

  // Debounce sobre el buscador y los inputs de precio; con un rango inválido no se pide nada
  // nuevo y sigue en pantalla el último resultado válido. Ojo: NO se cae a
  // EMPTY_FILTERS, porque eso mostraría el catálogo entero (sin siquiera la
  // especialidad elegida) apenas se tipea el primer dígito del precio máximo.
  const debouncedFilters = useDebouncedValue(filters, 300);
  const [appliedFilters, setAppliedFilters] = useState<CatalogFilters>(EMPTY_FILTERS);

  // Ajuste durante el render (no un efecto): React vuelve a renderizar con el
  // valor nuevo antes de pintar, así que la lista nunca se ve con los filtros
  // viejos por un frame.
  if (appliedFilters !== debouncedFilters && !validatePriceRange(debouncedFilters)) {
    setAppliedFilters(debouncedFilters);
  }

  const catalog = useProfessionalsCatalog(appliedFilters);

  return (
    <>
      {/* El título vive en cada marco, no acá: la pública lo pone en su hero y
          la de adentro de la app ya lo tiene en la barra superior. Repetirlo
          dejaría dos "Buscar profesionales" en la misma pantalla. */}
      <div className="grid items-start gap-6 lg:grid-cols-[262px_minmax(0,1fr)]">
        <CatalogFiltersPanel
          filters={filters}
          onChange={setFilters}
          priceRangeError={priceRangeError}
        />

        <div className="grid gap-4">
          <CatalogSearchBox
            value={filters.search}
            onChange={(search) => setFilters({ ...filters, search })}
          />

          <ProfessionalsList
            basePath={basePath}
            professionals={catalog.professionals}
            total={catalog.total}
            isLoading={catalog.isLoading}
            isFiltering={catalog.isFiltering}
            isError={catalog.isError}
            errorMessage={catalog.error?.message}
            onRetry={() => void catalog.refetch()}
            hasNextPage={catalog.hasNextPage}
            isFetchingNextPage={catalog.isFetchingNextPage}
            onLoadMore={() => void catalog.fetchNextPage()}
            hasFilters={hasAnyFilter(appliedFilters)}
            search={appliedFilters.search.trim()}
          />
        </div>
      </div>
    </>
  );
}
