/** Los períodos del resumen del inicio (ENG-198). Puro, para testearlo sin React. */
export type SummaryPeriod = '30D' | 'ANIO';

export const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  '30D': 'Últimos 30 días',
  ANIO: 'Este año',
};

function hoyEnArgentina(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    now,
  );
}

/** `from`/`to` de cada período, en fechas de Argentina. */
export function periodRange(
  period: SummaryPeriod,
  now: Date = new Date(),
): { from: string; to: string } {
  const hoy = hoyEnArgentina(now);
  if (period === 'ANIO') return { from: `${hoy.slice(0, 4)}-01-01`, to: hoy };
  const desde = new Date(`${hoy}T12:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - 29);
  return { from: desde.toISOString().slice(0, 10), to: hoy };
}
