import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { formatAverage } from '../lib/reviews';

const STAR =
  'M10 1.8l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.42 5.06 17.01 6 11.5 2 7.6l5.53-.8L10 1.8Z';

/**
 * Estrellas de solo lectura. El número va en `aria-label`: "4 de 5 estrellas".
 * Un promedio se dibuja redondeado pero se anuncia tal cual ("4,5 de 5").
 */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const redondeado = Math.round(value);
  const numero = Number.isInteger(value) ? String(value) : formatAverage(value);
  return (
    <span
      role="img"
      aria-label={`${numero} de 5 estrellas`}
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

const SIGUIENTE: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Elegir de 1 a 5 estrellas. Es un radiogroup con roving tabindex: el Tab entra
 * una sola vez (en la elegida, o en la primera), las flechas cambian la
 * calificación y mueven el foco, y el lector de pantalla dice "3 estrellas, Buena".
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
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const paso = SIGUIENTE[e.key];
    if (!paso || disabled) return;
    e.preventDefault();
    // De 5 a 1 y de 1 a 5, como cualquier grupo de radios.
    const n = (((value || 1) + paso + 4) % 5) + 1;
    onChange(n);
    botones.current[n - 1]?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        onKeyDown={onKeyDown}
        className="flex gap-1"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => {
              botones.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
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
