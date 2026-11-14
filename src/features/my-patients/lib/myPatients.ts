import { formatDate } from '../../appointments/lib/weeks';
import type { AppointmentMoment, MyPatientsOrder, SortDir } from '../types';

/** Año de hoy en Argentina. */
function currentYearAR(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
  }).format(now);
}

/**
 * `12 de noviembre · 10:00`, en Argentina. Si no es de este año le agrega el
 * año (`3 de marzo de 2025 · 09:30`): en una lista de pacientes la última
 * consulta puede ser vieja, y sin año se confunde con la de este.
 */
export function formatMoment(m: AppointmentMoment, now: Date = new Date()): string {
  return `${formatDay(m, now)} · ${m.startTime}`;
}

/** Solo el día, con el mismo criterio del año: `12 de noviembre`, `3 de marzo de 2025`. */
export function formatDay(m: AppointmentMoment, now: Date = new Date()): string {
  const year = m.date.slice(0, 4);
  return year === currentYearAR(now) ? formatDate(m.date) : `${formatDate(m.date)} de ${year}`;
}

/** Sentido con el que arranca cada columna al tocarla: lo que primero interesa ver. */
export const DEFAULT_DIR: Record<MyPatientsOrder, SortDir> = {
  ULTIMA_CONSULTA: 'desc',
  PROXIMO_TURNO: 'asc',
  CONSULTAS: 'desc',
  PACIENTE_DESDE: 'asc',
  NOMBRE: 'asc',
};

/**
 * Tocar el encabezado de una columna: si ya ordenaba por esa, invierte el
 * sentido; si no, ordena por esa con su sentido por defecto.
 */
export function toggleSort(
  actual: { orden: MyPatientsOrder; dir: SortDir },
  columna: MyPatientsOrder,
): { orden: MyPatientsOrder; dir: SortDir } {
  if (actual.orden === columna) {
    return { orden: columna, dir: actual.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { orden: columna, dir: DEFAULT_DIR[columna] };
}

export const NEXT_OPTIONS = [
  { value: 'CON_PROXIMO', label: 'Con próximo turno' },
  { value: 'SIN_PROXIMO', label: 'Sin próximo turno' },
] as const;

export const LAST_OPTIONS = [
  { value: '30D', label: 'Atendidos en los últimos 30 días' },
  { value: '90D', label: 'Atendidos en los últimos 3 meses' },
  { value: 'MAS_DE_6M', label: 'Sin venir hace más de 6 meses' },
  { value: 'NUNCA', label: 'Todavía sin consultas' },
] as const;
