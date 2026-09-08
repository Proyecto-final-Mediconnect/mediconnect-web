type Props = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Buscador por texto del catálogo.
 *
 * Filtra **sobre los resultados ya cargados**, no contra el catálogo entero: el
 * endpoint no acepta un parámetro de búsqueda todavía (ver
 * `lib/localCatalogFilters`). Por eso no hay botón "Buscar" como en el canvas —
 * sería un botón que no dispara nada, porque el filtrado es inmediato mientras
 * se escribe.
 *
 * El `<form>` con `onSubmit` que no hace nada más que evitar el reload existe
 * para que Enter no rompa la página: en un campo de búsqueda es el gesto que
 * todo el mundo hace.
 */
export function CatalogSearchBox({ value, onChange }: Props) {
  return (
    <form
      className="rounded-[14px] border border-line bg-white px-6 py-[22px]"
      onSubmit={(e) => e.preventDefault()}
      role="search"
    >
      <label htmlFor="catalogo-busqueda" className="text-[15px] font-bold text-brand-deep">
        ¿A quién necesitás ver?
      </label>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <input
          id="catalogo-busqueda"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Especialidad o nombre del profesional"
          className="min-w-[240px] flex-1 rounded-[10px] border border-line-strong px-4 py-3.5 text-[15px] font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        {value !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-[10px] border border-line-strong bg-white px-6 py-3.5 text-[15px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Borrar
          </button>
        )}
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-muted">
        Podés escribir una especialidad o el nombre de un profesional. Se busca entre los
        resultados que ya están cargados.
      </p>
    </form>
  );
}
