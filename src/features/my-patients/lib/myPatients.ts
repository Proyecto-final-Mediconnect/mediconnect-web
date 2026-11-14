import { formatDate } from '../../appointments/lib/weeks';
import type { AppointmentMoment } from '../types';

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
  const year = m.date.slice(0, 4);
  const fecha =
    year === currentYearAR(now) ? formatDate(m.date) : `${formatDate(m.date)} de ${year}`;
  return `${fecha} · ${m.startTime}`;
}
