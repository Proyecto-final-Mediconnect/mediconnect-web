/**
 * El botón de los PDF de los paneles (ENG-231). Discreto: la acción principal
 * del panel es otra. Mientras se genera dice que está generando, y si falla
 * muestra por qué al lado.
 */
export function ExportPdfButton({
  onClick,
  disabled,
  generando = false,
  error,
  label = 'Exportar PDF',
}: {
  onClick: () => void;
  disabled?: boolean;
  generando?: boolean;
  error?: string | null;
  label?: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || generando}
        aria-busy={generando}
        className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-xs font-semibold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path
            d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {generando ? 'Generando PDF…' : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
