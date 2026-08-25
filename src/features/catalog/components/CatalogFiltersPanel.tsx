import { Button } from '../../../shared/ui/Button';
import { useSpecialties } from '../hooks/useSpecialties';
import { EMPTY_FILTERS, type CatalogFilters } from '../types/catalog';

type Props = {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  /** Rango inválido detectado en el padre (ver lib/priceRange). */
  priceRangeError?: string;
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30';

export function CatalogFiltersPanel({ filters, onChange, priceRangeError }: Props) {
  const { data: specialties, isError: specialtiesFailed } = useSpecialties();
  const hasFilters =
    filters.specialtyId !== '' || filters.minPrice !== '' || filters.maxPrice !== '';

  const update = (patch: Partial<CatalogFilters>) => onChange({ ...filters, ...patch });

  return (
    <section
      aria-label="Filtros del catálogo"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-especialidad" className="text-sm font-medium text-ink">
            Especialidad
          </label>
          <select
            id="filtro-especialidad"
            className={fieldClass}
            value={filters.specialtyId}
            onChange={(e) => update({ specialtyId: e.target.value })}
          >
            <option value="">Todas las especialidades</option>
            {specialties?.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          {specialtiesFailed && (
            <p className="text-sm text-danger">No pudimos cargar las especialidades.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-precio-min" className="text-sm font-medium text-ink">
            Precio mínimo
          </label>
          <input
            id="filtro-precio-min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Sin mínimo"
            className={fieldClass}
            value={filters.minPrice}
            aria-invalid={!!priceRangeError}
            onChange={(e) => update({ minPrice: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-precio-max" className="text-sm font-medium text-ink">
            Precio máximo
          </label>
          <input
            id="filtro-precio-max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Sin máximo"
            className={fieldClass}
            value={filters.maxPrice}
            aria-invalid={!!priceRangeError}
            aria-describedby={priceRangeError ? 'filtro-precio-error' : undefined}
            onChange={(e) => update({ maxPrice: e.target.value })}
          />
        </div>
      </div>

      {priceRangeError && (
        <p id="filtro-precio-error" className="mt-3 text-sm text-danger">
          {priceRangeError}
        </p>
      )}

      {hasFilters && (
        <Button variant="ghost" className="mt-3 px-0" onClick={() => onChange(EMPTY_FILTERS)}>
          Limpiar filtros
        </Button>
      )}
    </section>
  );
}
