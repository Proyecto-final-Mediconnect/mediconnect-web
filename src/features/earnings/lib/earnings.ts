import type { EarningRow, EarningState, EarningsOrder } from '../types';

/**
 * El mes de "Mis cobros" (ENG-194): `YYYY-MM`, con sus días primero y último.
 * Puro para testearlo sin React.
 */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(ultimo).padStart(2, '0')}` };
}

/** `2026-11` + `delta` meses. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** El mes de hoy en Argentina. */
export function currentMonth(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).format(now);
}

/** `Noviembre de 2026`: solo la primera letra en mayúscula. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const texto = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Hoy en Argentina, `YYYY-MM-DD`. */
export function todayAR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(now);
}

/** `YYYY-MM-DD` corrido `dias` días. */
function shiftDay(day: string, dias: number): string {
  const fecha = new Date(`${day}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Cómo se elige el período: un mes, los últimos días, el año o un rango a mano. */
export type PeriodKind = 'MES' | '30D' | '90D' | 'ANIO' | 'RANGO';

export const PERIOD_OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: 'MES', label: 'Por mes' },
  { value: '30D', label: 'Últimos 30 días' },
  { value: '90D', label: 'Últimos 90 días' },
  { value: 'ANIO', label: 'Este año' },
  { value: 'RANGO', label: 'Elegir fechas' },
];

/** El rango más largo que acepta el backend. */
export const MAX_RANGE_DAYS = 366;

/**
 * `from`/`to` del período elegido, o un mensaje si el rango a mano no sirve
 * (incompleto, al revés o más largo que un año).
 */
export function periodRange(
  kind: PeriodKind,
  opts: { mes: string; desde: string; hasta: string },
  now: Date = new Date(),
): { from: string; to: string } | { error: string } {
  const hoy = todayAR(now);
  switch (kind) {
    case 'MES':
      return monthRange(opts.mes);
    case '30D':
      return { from: shiftDay(hoy, -29), to: hoy };
    case '90D':
      return { from: shiftDay(hoy, -89), to: hoy };
    case 'ANIO':
      return { from: `${hoy.slice(0, 4)}-01-01`, to: hoy };
    case 'RANGO': {
      if (!opts.desde || !opts.hasta) return { error: 'Elegí las dos fechas.' };
      if (opts.desde > opts.hasta) {
        return { error: 'La fecha de inicio tiene que ser anterior a la de fin.' };
      }
      const dias = (Date.parse(opts.hasta) - Date.parse(opts.desde)) / 86_400_000 + 1;
      if (dias > MAX_RANGE_DAYS) return { error: 'Elegí un rango de hasta un año.' };
      return { from: opts.desde, to: opts.hasta };
    }
  }
}

export const STATE_OPTIONS: { value: EarningState; label: string }[] = [
  { value: 'COBRADO', label: 'Cobrado' },
  { value: 'REEMBOLSO_PARCIAL', label: 'Reembolsado en parte' },
  { value: 'REEMBOLSADO', label: 'Reembolsado' },
  { value: 'REEMBOLSO_PENDIENTE', label: 'Reembolso pendiente' },
];

export const ORDER_OPTIONS: { value: EarningsOrder; label: string }[] = [
  { value: 'RECIENTES', label: 'Más recientes' },
  { value: 'ANTIGUOS', label: 'Más antiguos' },
  { value: 'MAYOR_MONTO', label: 'Mayor monto' },
];

/** El chip de cada cobro: qué pasó con la plata. */
export function earningChip(row: EarningRow): { label: string; tone: 'ok' | 'warn' | 'neutral' } {
  switch (row.state) {
    case 'COBRADO':
      return { label: 'Cobrado', tone: 'ok' };
    case 'REEMBOLSO_PARCIAL':
      return { label: `Reembolsado ${row.refundPercent ?? 0} %`, tone: 'warn' };
    case 'REEMBOLSADO':
      return { label: 'Reembolsado', tone: 'neutral' };
    case 'REEMBOLSO_PENDIENTE':
      return { label: 'Reembolso pendiente', tone: 'warn' };
  }
}
