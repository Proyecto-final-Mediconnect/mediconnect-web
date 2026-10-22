const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RELATIVE = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
const DATE = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
});

/**
 * Cuándo llegó un aviso, como se lee en una bandeja: "recién", "hace 5
 * minutos", "ayer"… y la fecha corta después de una semana, cuando "hace 23
 * días" ya no ayuda a ubicarlo.
 */
export function relativeTime(now: Date, iso: string): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (Number.isNaN(diff)) return '';

  if (diff < MINUTE) return 'recién';
  if (diff < HOUR) return RELATIVE.format(-Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return RELATIVE.format(-Math.floor(diff / HOUR), 'hour');
  if (diff < 7 * DAY) return RELATIVE.format(-Math.floor(diff / DAY), 'day');
  return DATE.format(then);
}
