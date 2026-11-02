import { useId } from 'react';

const STAR =
  'M10 1.8l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.42 5.06 17.01 6 11.5 2 7.6l5.53-.8L10 1.8Z';

/** Estrellas de solo lectura. El número va en `aria-label`: "4 de 5 estrellas". */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const redondeado = Math.round(value);
  return (
    <span
      role="img"
      aria-label={`${redondeado} de 5 estrellas`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          aria-hidden="true"
          viewBox="0 0 20 20"
          width={size}
          height={size}
          className={n <= redondeado ? 'text-tag-warm-dot' : 'text-line-strong'}
        >
          <path d={STAR} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

const ETIQUETAS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];

/**
 * Elegir de 1 a 5 estrellas. Es un radiogroup: se maneja con flechas y el
 * lector de pantalla dice "3 estrellas, Buena".
 */
export function StarInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}, ${ETIQUETAS[n]}`}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="rounded-full p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:hover:scale-100"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              width={30}
              height={30}
              className={n <= value ? 'text-tag-warm-dot' : 'text-line-strong'}
            >
              <path d={STAR} fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
      <span id={`${id}-label`} className="text-sm font-semibold text-muted">
        {value ? ETIQUETAS[value] : 'Tu calificación'}
      </span>
    </div>
  );
}
