const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

/**
 * El día del turno en un bloque (`MIÉ / 28`), para escanear la lista por fecha
 * (ENG-178). El día de la semana sale de la fecha local del turno, no del reloj
 * de quien mira.
 */
export function DateBadge({ date, muted = false }: { date: string; muted?: boolean }) {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

  return (
    <span
      aria-hidden="true"
      className={`flex size-12 flex-none flex-col items-center justify-center rounded-[10px] ${
        muted ? 'bg-line-soft text-muted' : 'bg-surface-teal text-brand-deep'
      }`}
    >
      <span className="text-[10px] font-semibold tracking-[0.08em]">{weekday}</span>
      <span className="text-[17px] font-bold leading-none">{d}</span>
    </span>
  );
}
