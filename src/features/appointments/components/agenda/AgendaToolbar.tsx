import {
  PERIOD_LABELS,
  STATUS_FILTER_LABELS,
  type AgendaFilters,
  type Period,
  type StatusFilter,
} from '../../lib/agenda';

const SELECT =
  'rounded-full border border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/**
 * Búsqueda y filtros de "Mis turnos" (ENG-178), separados del encabezado. Los
 * filtros se ven siempre —dos selectores— en vez de esconderse en un panel: en
 * la web hay lugar, y así se ve de un vistazo qué se está filtrando.
 */
export function AgendaToolbar({
  filters,
  onChange,
  searchLabel,
}: {
  filters: AgendaFilters;
  onChange: (filters: AgendaFilters) => void;
  searchLabel: string;
}) {
  const filtrando =
    filters.search.trim() !== '' || filters.period !== 'todos' || filters.status !== 'todos';

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">{searchLabel}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={searchLabel}
          className="w-full rounded-full border border-line-strong bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted-soft focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </label>

      <label>
        <span className="sr-only">Fecha</span>
        <select
          value={filters.period}
          onChange={(e) => onChange({ ...filters, period: e.target.value as Period })}
          className={SELECT}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Estado</span>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as StatusFilter })}
          className={SELECT}
        >
          {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_FILTER_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {filtrando && (
        <button
          type="button"
          onClick={() => onChange({ search: '', period: 'todos', status: 'todos' })}
          className="px-2 text-sm font-semibold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
