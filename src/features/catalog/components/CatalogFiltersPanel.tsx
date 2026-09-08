import { useSpecialties } from '../hooks/useSpecialties';
import {
  EMPTY_LOCAL_FILTERS,
  hasLocalFilters,
  type LocalCatalogFilters,
} from '../lib/localCatalogFilters';
import { EMPTY_FILTERS, hasAnyFilter, type CatalogFilters } from '../types/catalog';

type Props = {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  /** Rango inválido detectado en el padre (ver lib/priceRange). */
  priceRangeError?: string;
  /** Filtros que resuelve el cliente porque el backend no los soporta. */
  localFilters: LocalCatalogFilters;
  onLocalChange: (filters: LocalCatalogFilters) => void;
};

/**
 * Barra lateral de filtros del catálogo.
 *
 * `position: sticky` no es decoración: con scroll infinito la lista se vuelve
 * larga enseguida, y sin esto refiltrar obliga a volver al tope de la página.
 *
 * Las especialidades se eligen de una lista y no de un `<select>`, como en el
 * canvas. Se implementan con casillas reales en vez de `<button>`: el navegador
 * ya da el recorrido con Tab, el anuncio de "casilla marcada" y el agrupamiento
 * por `<fieldset>`, y nada de eso se consigue gratis con botones.
 *
 * Se puede marcar más de una (ENG-49): entran los profesionales que tengan
 * ALGUNA de las elegidas. Por eso ya no hay opción "Todas" — con casillas,
 * ninguna marcada ES "todas", y una opción aparte para eso sobraría.
 */

const SECTION = 'border-b border-line-soft px-[22px] py-5 last:border-b-0';
const SECTION_TITLE =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted';
const PRICE_FIELD =
  'w-full rounded-[9px] border border-line-strong bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25';

export function CatalogFiltersPanel({
  filters,
  onChange,
  priceRangeError,
  localFilters,
  onLocalChange,
}: Props) {
  const { data: specialties, isError: specialtiesFailed } = useSpecialties();
  const hasFilters = hasAnyFilter(filters) || hasLocalFilters(localFilters);

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
      className="overflow-hidden rounded-[14px] border border-line bg-white lg:sticky lg:top-24"
    >
      <div className="flex items-center justify-between border-b border-line-soft px-[22px] py-[18px]">
        <h2 className="text-base font-bold text-brand-deep">Filtros</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              onChange(EMPTY_FILTERS);
              onLocalChange(EMPTY_LOCAL_FILTERS);
            }}
            className="text-[13px] font-semibold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Limpiar
          </button>
        )}
      </div>

      <fieldset className={SECTION}>
        <legend className={SECTION_TITLE}>Especialidades</legend>

        <div className="mt-3.5 grid gap-2.5">
          {(specialties ?? []).map((option) => {
            const checked = filters.specialtyIds.includes(option.id);

            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  value={option.id}
                  checked={checked}
                  onChange={() => toggleSpecialty(option.id)}
                />
                <span
                  aria-hidden="true"
                  className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border text-[10px] font-bold text-white transition-colors ${
                    checked ? 'border-brand-deep bg-brand-deep' : 'border-line-strong bg-white'
                  }`}
                >
                  {checked ? '✓' : ''}
                </span>
                <span className={checked ? 'text-brand-deep' : undefined}>{option.name}</span>
              </label>
            );
          })}
        </div>

        {/* La ayuda aparece solo con algo tildado. Sin nada marcado el estado ya
            es evidente, y una línea fija sería ruido en cada carga. */}
        {filters.specialtyIds.length > 1 && (
          <p className="mt-3 text-[13px] leading-snug text-muted">
            Entran los profesionales que trabajen en alguna de las{' '}
            {filters.specialtyIds.length} elegidas.
          </p>
        )}

        {specialtiesFailed && (
          <p className="mt-3 text-sm text-danger">No pudimos cargar las especialidades.</p>
        )}
      </fieldset>

      <div className={SECTION}>
        <div className={SECTION_TITLE}>Precio de consulta</div>

        <div className="mt-3 grid gap-2.5">
          <div className="grid gap-1.5">
            <label htmlFor="filtro-precio-min" className="text-xs font-medium text-muted">
              Precio mínimo
            </label>
            <input
              id="filtro-precio-min"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Sin mínimo"
              className={PRICE_FIELD}
              value={filters.minPrice}
              aria-invalid={!!priceRangeError}
              onChange={(e) => update({ minPrice: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="filtro-precio-max" className="text-xs font-medium text-muted">
              Precio máximo
            </label>
            <input
              id="filtro-precio-max"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Sin máximo"
              className={PRICE_FIELD}
              value={filters.maxPrice}
              aria-invalid={!!priceRangeError}
              aria-describedby={priceRangeError ? 'filtro-precio-error' : undefined}
              onChange={(e) => update({ maxPrice: e.target.value })}
            />
          </div>
        </div>

        {priceRangeError && (
          <p id="filtro-precio-error" className="mt-2.5 text-sm text-danger">
            {priceRangeError}
          </p>
        )}
      </div>

      <div className={SECTION}>
        <label htmlFor="filtro-disponibilidad" className={SECTION_TITLE}>
          Disponibilidad
        </label>
        <select
          id="filtro-disponibilidad"
          className={`mt-3 ${PRICE_FIELD}`}
          value={localFilters.withinDays ?? ''}
          onChange={(e) =>
            onLocalChange({
              ...localFilters,
              withinDays: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        >
          <option value="">Cualquier fecha</option>
          <option value="0">Hoy</option>
          <option value="2">Próximos 3 días</option>
          <option value="7">Próximos 7 días</option>
        </select>
      </div>

      <fieldset className={SECTION}>
        <legend className={SECTION_TITLE}>Calificación mínima</legend>
        <div className="mt-3 flex gap-2">
          {[null, 4, 4.5].map((value) => {
            const active = localFilters.minRating === value;

            return (
              <button
                key={String(value)}
                type="button"
                aria-pressed={active}
                onClick={() => onLocalChange({ ...localFilters, minRating: value })}
                className={`rounded-[9px] border px-3 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                  active
                    ? 'border-brand-deep bg-brand-deep text-white'
                    : 'border-line-strong bg-white text-brand-deep hover:border-brand'
                }`}
              >
                {value === null ? 'Todas' : `${value}+`}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
