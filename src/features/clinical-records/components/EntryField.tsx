/**
 * Campo de texto multilínea de los formularios de HC.
 *
 * Los cinco campos —los cuatro clínicos y el motivo de una corrección— son
 * narrativos, así que todos son `textarea` y ninguno es un `input` de una línea.
 *
 * Vive en su propio módulo porque lo comparten el alta (ENG-58) y la corrección
 * (ENG-100): son el mismo formulario con otro encabezado, y duplicar el campo
 * garantizaba que un día el error de validación se anunciara distinto en cada uno.
 */
export function EntryField({
  id,
  label,
  value,
  rows,
  required,
  error,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  rows: number;
  required?: boolean;
  error?: string;
  /** Aclaración debajo del rótulo. Solo la usa el motivo de la corrección. */
  hint?: string;
  onChange: (value: string) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
        {!required && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-[12px] leading-[1.6] text-muted">
          {hint}
        </p>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        aria-invalid={!!error}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-y rounded-[9px] border bg-white px-3.5 py-2.5 text-sm leading-[1.7] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/30 ${
          error ? 'border-danger' : 'border-line-strong'
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
