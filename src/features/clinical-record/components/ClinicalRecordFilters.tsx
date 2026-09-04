import {
  ENTRY_TYPE_LABELS,
  TODOS,
  type ClinicalEntryType,
  type ClinicalRecordFilters as Filtros,
} from '../types/clinicalRecord';

/**
 * Filtros de la historia clínica (ENG-59).
 *
 * El tipo de registro va como `<select>` y no como una lista de botones: son
 * seis opciones excluyentes en una columna angosta, y un desplegable se recorre
 * con el teclado y se anuncia como "opción 2 de 6". Es el mismo criterio que en
 * el catálogo, donde la lista de especialidades sí quedó como radios porque se
 * ven todas de una.
 */

type ClinicalRecordFiltersProps = {
  filters: Filtros;
  onChange: (filters: Filtros) => void;
  profesionales: { id: string; nombre: string }[];
  hayFiltros: boolean;
  onLimpiar: () => void;
};

const CAMPO =
  'w-full rounded-[8px] border border-line-strong bg-white px-3 py-2 text-[13px] font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export function ClinicalRecordFilters({
  filters,
  onChange,
  profesionales,
  hayFiltros,
  onLimpiar,
}: ClinicalRecordFiltersProps) {
  const set = (patch: Partial<Filtros>) => onChange({ ...filters, ...patch });

  return (
    <section
      aria-label="Filtros de la historia clínica"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-[18px]">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Filtros
        </h2>
        {hayFiltros && (
          <button
            type="button"
            onClick={onLimpiar}
            className="text-[12px] font-semibold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Limpiar
          </button>
        )}
      </header>

      <div className="grid gap-4 px-5 py-[18px]">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
            Rango de fechas
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="text-[13px]">
              <span className="mb-1 block font-semibold text-muted">Desde</span>
              <input
                type="date"
                value={filters.desde ?? ''}
                onChange={(e) => set({ desde: e.target.value || null })}
                className={CAMPO}
              />
            </label>
            <label className="text-[13px]">
              <span className="mb-1 block font-semibold text-muted">Hasta</span>
              <input
                type="date"
                value={filters.hasta ?? ''}
                onChange={(e) => set({ hasta: e.target.value || null })}
                className={CAMPO}
              />
            </label>
          </div>
        </div>

        <label className="text-[13px]">
          <span className="mb-1 block font-semibold text-muted">Tipo de registro</span>
          <select
            value={filters.tipo}
            onChange={(e) => set({ tipo: e.target.value as ClinicalEntryType | typeof TODOS })}
            className={CAMPO}
          >
            <option value={TODOS}>Todos</option>
            {(Object.keys(ENTRY_TYPE_LABELS) as ClinicalEntryType[]).map((tipo) => (
              <option key={tipo} value={tipo}>
                {ENTRY_TYPE_LABELS[tipo]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[13px]">
          <span className="mb-1 block font-semibold text-muted">Profesional</span>
          <select
            value={filters.professionalId}
            onChange={(e) => set({ professionalId: e.target.value })}
            className={CAMPO}
          >
            <option value={TODOS}>Todos</option>
            {profesionales.map((profesional) => (
              <option key={profesional.id} value={profesional.id}>
                {profesional.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2.5 border-t border-line-soft pt-4">
          <Casilla
            checked={filters.soloConAdjuntos}
            onChange={(v) => set({ soloConAdjuntos: v })}
          >
            Con estudios adjuntos
          </Casilla>
          <Casilla
            checked={filters.soloCorrecciones}
            onChange={(v) => set({ soloCorrecciones: v })}
          >
            Solo entradas con correcciones
          </Casilla>
        </div>
      </div>
    </section>
  );
}

function Casilla({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[17px] accent-brand"
      />
      {children}
    </label>
  );
}
