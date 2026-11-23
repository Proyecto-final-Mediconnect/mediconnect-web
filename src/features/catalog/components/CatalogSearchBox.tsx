type Props = {
  value: string;
  onChange: (value: string) => void;
};

/** Largo máximo que acepta el backend en `search`: más largo respondería 400. */
const MAX_SEARCH_LENGTH = 80;

/**
 * Buscador por texto del catálogo.
 *
 * Busca en el catálogo entero: el texto viaja al backend como `search`
 * (ENG-233), con el mismo debounce que los filtros de precio. Por eso no hay
 * botón "Buscar" como en el canvas: la búsqueda sale sola cuando se deja de
 * escribir.
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
          maxLength={MAX_SEARCH_LENGTH}
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
        Podés escribir una especialidad o el nombre de un profesional.
      </p>
    </form>
  );
}
