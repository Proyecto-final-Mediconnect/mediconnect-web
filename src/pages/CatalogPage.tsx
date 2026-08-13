import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogFiltersPanel } from '../features/catalog/components/CatalogFiltersPanel';
import { ProfessionalsList } from '../features/catalog/components/ProfessionalsList';
import { useProfessionalsCatalog } from '../features/catalog/hooks/useProfessionalsCatalog';
import { validatePriceRange } from '../features/catalog/lib/priceRange';
import { EMPTY_FILTERS, type CatalogFilters } from '../features/catalog/types/catalog';
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue';
import { Button } from '../shared/ui/Button';
import { Logo } from '../shared/ui/Logo';

/**
 * Catálogo público (ENG-49). Es una ruta abierta: no la envuelve ningún
 * guard de sesión, y no dispara GET /auth/me.
 */
export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const priceRangeError = validatePriceRange(filters);

  // Debounce sobre los inputs de precio; con un rango inválido no se pide
  // nada nuevo y sigue en pantalla el último resultado válido.
  const debouncedFilters = useDebouncedValue(filters, 300);
  const appliedFilters = priceRangeError ? EMPTY_FILTERS : debouncedFilters;

  const catalog = useProfessionalsCatalog(appliedFilters);
  const hasFilters =
    appliedFilters.specialtyId !== '' ||
    appliedFilters.minPrice !== '' ||
    appliedFilters.maxPrice !== '';

  return (
    <div className="min-h-svh bg-surface">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Ir al inicio">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/ingresar">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link to="/registro">
              <Button variant="primary">Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold text-brand-deep">Profesionales disponibles</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Todos los profesionales del catálogo tienen la matrícula verificada. Filtrá por
          especialidad y precio para encontrar el que se adapte a lo que necesitás.
        </p>

        <div className="mt-8">
          <CatalogFiltersPanel
            filters={filters}
            onChange={setFilters}
            priceRangeError={priceRangeError}
          />
        </div>

        <div className="mt-8">
          <ProfessionalsList
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
            hasFilters={hasFilters}
          />
        </div>
      </main>
    </div>
  );
}
