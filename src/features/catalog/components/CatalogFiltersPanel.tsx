import { Button } from '../../../shared/ui/Button';
import { useSpecialties } from '../hooks/useSpecialties';
import { EMPTY_FILTERS, hasAnyFilter, type CatalogFilters } from '../types/catalog';

type Props = {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  /** Rango inválido detectado en el padre (ver lib/priceRange). */
  priceRangeError?: string;
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30';

/**
 * Chip de especialidad. Es un `<input type="checkbox">` real dentro de un
 * `<label>`, no un `<button>` con estado propio: así el lector de pantalla lo
 * anuncia como casilla marcable, se llega con Tab y se activa con Espacio sin
 * reimplementar nada. La casilla se oculta a la vista (`sr-only`) pero sigue
 * existiendo para el foco, y el estilo del chip cuelga de `peer-checked`.
 */
function SpecialtyChip({
  name,
  checked,
  onToggle,
}: {
  name: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onToggle} />
      <span className="inline-block rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-brand peer-checked:border-brand peer-checked:bg-surface-teal peer-checked:font-medium peer-checked:text-brand-hover peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
        {name}
      </span>
    </label>
  );
}

export function CatalogFiltersPanel({ filters, onChange, priceRangeError }: Props) {
  const { data: specialties, isError: specialtiesFailed } = useSpecialties();
  const hasFilters = hasAnyFilter(filters);

  const update = (patch: Partial<CatalogFilters>) => onChange({ ...filters, ...patch });

  /**
   * Marca o desmarca una especialidad.
   *
   * La lista resultante se reordena según el catálogo y no según el orden en que
   * se fue tildando: el mismo conjunto de especialidades tiene que producir
   * siempre el mismo query string y la misma queryKey, o React Query guardaría
   * una entrada de caché distinta por cada orden de clics.
   */
  const toggleSpecialty = (specialtyId: string) => {
    const selected = new Set(filters.specialtyIds);
    if (!selected.delete(specialtyId)) selected.add(specialtyId);

    update({
      specialtyIds: (specialties ?? [])
        .map((specialty) => specialty.id)
        .filter((id) => selected.has(id)),
    });
  };

  return (
    <section
      aria-label="Filtros del catálogo"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-ink">Especialidades</legend>

          {specialties && specialties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <SpecialtyChip
                  key={specialty.id}
                  name={specialty.name}
                  checked={filters.specialtyIds.includes(specialty.id)}
                  onToggle={() => toggleSpecialty(specialty.id)}
                />
              ))}
            </div>
          )}

          {/* La ayuda aparece solo con algo tildado. Sin selección el estado ya
              es evidente —no hay ningún chip marcado— y una línea fija debajo de
              los filtros sería ruido en cada carga de la página. */}
          {filters.specialtyIds.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              {filters.specialtyIds.length === 1
                ? 'Mostrando profesionales de 1 especialidad.'
                : `Mostrando profesionales de ${filters.specialtyIds.length} especialidades: entran los que trabajan en alguna de las elegidas.`}
            </p>
          )}

          {specialtiesFailed && (
            <p className="text-sm text-danger">No pudimos cargar las especialidades.</p>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
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
