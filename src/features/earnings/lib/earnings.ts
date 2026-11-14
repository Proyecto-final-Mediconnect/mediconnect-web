import type { EarningRow } from '../types';

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

/** `noviembre de 2026`. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

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
