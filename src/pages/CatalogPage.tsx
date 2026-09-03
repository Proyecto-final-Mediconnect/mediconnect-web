import { useState } from 'react';
import { CatalogFiltersPanel } from '../features/catalog/components/CatalogFiltersPanel';
import { CatalogSearchBox } from '../features/catalog/components/CatalogSearchBox';
import { ProfessionalsList } from '../features/catalog/components/ProfessionalsList';
import { useProfessionalsCatalog } from '../features/catalog/hooks/useProfessionalsCatalog';
import {
  applyLocalFilters,
  EMPTY_LOCAL_FILTERS,
  hasLocalFilters,
  type LocalCatalogFilters,
} from '../features/catalog/lib/localCatalogFilters';
import { validatePriceRange } from '../features/catalog/lib/priceRange';
import { EMPTY_FILTERS, type CatalogFilters } from '../features/catalog/types/catalog';
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue';
import { PUBLIC_SHELL, PublicHeader } from '../shared/ui/PublicHeader';

/**
 * Catálogo público (ENG-49), con el diseño del canvas.
 *
 * Es una ruta abierta: no la envuelve ningún guard de sesión y no dispara
 * GET /auth/me.
 *
 * El diseño la plantea como dos columnas —filtros fijos a la izquierda,
 * resultados a la derecha— en vez del panel horizontal que había. La barra de
 * filtros queda pegada al hacer scroll, que es lo que la vuelve usable cuando
 * la lista es larga: refiltrar no obliga a volver arriba.
 *
 * **El canvas muestra tres filtros que la API no soporta** (búsqueda por texto
 * libre, disponibilidad y calificación mínima) y datos de tarjeta que el
 * endpoint no devuelve. No se dibujan controles muertos: se construye lo que
 * existe. El detalle está en el PR.
 */
export function CatalogPage() {
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
    <div className="min-h-svh bg-surface">
      <PublicHeader />

      <main className={`${PUBLIC_SHELL} pb-[88px] pt-10`}>
        <h1 className="font-display text-[32px] leading-[1.1] text-brand-deep lg:text-[40px]">
          Buscar profesionales
        </h1>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.65] text-muted">
          Todos los profesionales del catálogo tienen la matrícula verificada. Filtrá por
          especialidad y precio para encontrar el que se adapte a lo que necesitás.
        </p>

        <div className="mt-[26px] grid items-start gap-6 lg:grid-cols-[262px_minmax(0,1fr)]">
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
      </main>
    </div>
  );
}
