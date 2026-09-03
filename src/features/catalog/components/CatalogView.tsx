import { useState } from 'react';
import { CatalogFiltersPanel } from './CatalogFiltersPanel';
import { CatalogSearchBox } from './CatalogSearchBox';
import { ProfessionalsList } from './ProfessionalsList';
import { useProfessionalsCatalog } from '../hooks/useProfessionalsCatalog';
import {
  applyLocalFilters,
  EMPTY_LOCAL_FILTERS,
  hasLocalFilters,
  type LocalCatalogFilters,
} from '../lib/localCatalogFilters';
import { validatePriceRange } from '../lib/priceRange';
import { EMPTY_FILTERS, type CatalogFilters } from '../types/catalog';
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

  // Debounce sobre los inputs de precio; con un rango inválido no se pide nada
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

  // Búsqueda por texto, disponibilidad y calificación: el backend no los
  // soporta, así que se resuelven sobre lo ya cargado (ver localCatalogFilters).
  const [localFilters, setLocalFilters] = useState<LocalCatalogFilters>(EMPTY_LOCAL_FILTERS);

  const catalog = useProfessionalsCatalog(appliedFilters);
  const visible = applyLocalFilters(catalog.professionals, localFilters);
  const localActive = hasLocalFilters(localFilters);

  const hasFilters =
    appliedFilters.specialtyId !== '' ||
    appliedFilters.minPrice !== '' ||
    appliedFilters.maxPrice !== '' ||
    localActive;

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
          localFilters={localFilters}
          onLocalChange={setLocalFilters}
        />

        <div className="grid gap-4">
          <CatalogSearchBox
            value={localFilters.query}
            onChange={(query) => setLocalFilters({ ...localFilters, query })}
          />

          <ProfessionalsList
            basePath={basePath}
            professionals={visible}
            // Con un filtro local activo, el total del backend ya no describe
            // lo que se ve en pantalla.
            total={localActive ? visible.length : catalog.total}
            isLoading={catalog.isLoading}
            isFiltering={catalog.isFiltering}
            isError={catalog.isError}
            errorMessage={catalog.error?.message}
            onRetry={() => void catalog.refetch()}
            hasNextPage={catalog.hasNextPage}
            isFetchingNextPage={catalog.isFetchingNextPage}
            onLoadMore={() => void catalog.fetchNextPage()}
            hasFilters={hasFilters}
          />
        </div>
      </div>
    </>
  );
}
