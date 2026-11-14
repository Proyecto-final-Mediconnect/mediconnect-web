import type { ProfessionalStats, StatsRate } from '../types';

/** Los períodos de "Mi actividad": meses calendario enteros, el actual incluido. */
export type ActivityPeriod = 'MES' | '3M' | '12M';

export const ACTIVITY_PERIODS: { value: ActivityPeriod; label: string; meses: number }[] = [
  { value: 'MES', label: 'Este mes', meses: 1 },
  { value: '3M', label: 'Últimos 3 meses', meses: 3 },
  { value: '12M', label: 'Últimos 12 meses', meses: 12 },
];

/** El que abre el panel; es también el default del backend. */
export const DEFAULT_ACTIVITY_PERIOD: ActivityPeriod = '3M';

/** El mes de hoy en Argentina, `YYYY-MM`. */
function currentMonthAR(now: Date): { y: number; m: number } {
  const [y, m] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  return { y, m };
}

const iso = (fecha: Date) => fecha.toISOString().slice(0, 10);

/**
 * `from`/`to` del período: del 1 del mes más viejo al último día del actual.
 * Meses enteros para que el gráfico muestre barras completas y los turnos
 * confirmados de lo que queda del mes cuenten como "por venir".
 */
export function activityRange(
  period: ActivityPeriod,
  now: Date = new Date(),
): { from: string; to: string } {
  const { meses } = ACTIVITY_PERIODS.find((p) => p.value === period)!;
  const { y, m } = currentMonthAR(now);
  return {
    from: iso(new Date(Date.UTC(y, m - meses, 1))),
    to: iso(new Date(Date.UTC(y, m, 0))),
  };
}

const UN_DECIMAL = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** `8` → `8,0 %`; sin base, una raya: nunca un 0 % que no es. */
export function formatRate(rate: StatsRate | null): string {
  return rate ? `${UN_DECIMAL.format(rate.porcentaje)} %` : '—';
}

/** La base de la tasa: `2 de 25`. */
export function rateBase(rate: StatsRate): string {
  return `${rate.numerador} de ${rate.denominador}`;
}

/** `4.7` → `4,7`. */
export function formatRating(promedio: number): string {
  return UN_DECIMAL.format(promedio);
}

/** `2026-09` → `septiembre de 2026`. */
export function monthLong(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** `2026-09` → `sep`: el rótulo corto de la barra. */
export function monthShort(mes: string): string {
  return monthLong(mes).slice(0, 3);
}

/** Alto de cada barra en % del más alto. Todo en 0 → todas en 0. */
export function barHeights(valores: number[]): number[] {
  const max = Math.max(0, ...valores);
  return valores.map((v) => (max === 0 ? 0 : Math.round((v / max) * 100)));
}

/** Sin ningún turno ni reseña en el período: se muestra el estado vacío. */
export function isEmptyPeriod(stats: ProfessionalStats): boolean {
  const t = stats.turnos;
  return (
    t.completados + t.noAsistio + t.cancelados + t.liberados + t.porVenir === 0 &&
    stats.resenas.cantidad === 0
  );
}

/** `1 consulta`, `2 consultas`. */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
