import { isActive } from './myAppointments';
import type { Appointment, AppointmentParty } from '../types/appointment';

/**
 * "Mis turnos" en una sola lista (ENG-178), con la misma lógica que la app
 * (ENG-169): arriba los próximos vigentes; abajo el resto —lo que ya pasó y lo
 * que se canceló— agrupado por mes, del más reciente al más viejo.
 */

export type Period = 'todos' | 'este-mes' | 'mes-pasado' | 'ultimos-3-meses' | 'este-anio';
export type StatusFilter = 'todos' | 'confirmados' | 'sin-pagar' | 'completados' | 'cancelados';

export interface AgendaFilters {
  search: string;
  period: Period;
  status: StatusFilter;
}

export const EMPTY_AGENDA_FILTERS: AgendaFilters = { search: '', period: 'todos', status: 'todos' };

export const PERIOD_LABELS: Record<Period, string> = {
  todos: 'Cualquier fecha',
  'este-mes': 'Este mes',
  'mes-pasado': 'Mes pasado',
  'ultimos-3-meses': 'Últimos 3 meses',
  'este-anio': 'Este año',
};

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  todos: 'Todos los estados',
  confirmados: 'Confirmados',
  'sin-pagar': 'Sin pagar',
  completados: 'Completados',
  cancelados: 'Cancelados o liberados',
};

const ESTADOS: Record<Exclude<StatusFilter, 'todos'>, string[]> = {
  confirmados: ['CONFIRMADO'],
  'sin-pagar': ['RESERVADO_SIN_PAGAR'],
  completados: ['COMPLETADO', 'NO_ASISTIO'],
  cancelados: ['CANCELADO', 'LIBERADO'],
};

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** `2026-10` → `Octubre 2026`. La historia cruza años: el año va siempre. */
export function formatMonthYear(yearMonth: string): string {
  return `${MESES[Number(yearMonth.slice(5, 7)) - 1]} ${yearMonth.slice(0, 4)}`;
}

/** Hoy en el calendario argentino, `YYYY-MM-DD`, aunque quien mira esté en otro huso. */
function hoyEnArgentina(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(now);
}

/** `YYYY-MM` corrido `meses` hacia atrás (negativo) o adelante. */
function mesRelativo(yearMonth: string, meses: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const total = y * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Si el turno cae en el período, según su fecha local (`date`): "este mes" es el
 *  mes del calendario argentino. */
export function inPeriod(appointment: Appointment, period: Period, now: Date): boolean {
  if (period === 'todos') return true;
  const hoy = hoyEnArgentina(now);
  const mes = hoy.slice(0, 7);
  const delTurno = appointment.date.slice(0, 7);

  switch (period) {
    case 'este-mes':
      return delTurno === mes;
    case 'mes-pasado':
      return delTurno === mesRelativo(mes, -1);
    case 'ultimos-3-meses':
      return delTurno >= mesRelativo(mes, -2) && delTurno <= mes;
    case 'este-anio':
      return appointment.date.slice(0, 4) === hoy.slice(0, 4);
  }
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function nombre(persona: AppointmentParty | null): string {
  return persona ? `${persona.firstName} ${persona.lastName}` : '';
}

/**
 * Filtra por nombre de la otra persona del turno (el profesional para el
 * paciente, el paciente para el profesional), período y estado.
 */
export function filterAgenda(
  appointments: Appointment[],
  filters: AgendaFilters,
  counterpart: (a: Appointment) => AppointmentParty | null,
  now: Date = new Date(),
): Appointment[] {
  const buscado = sinTildes(filters.search);
  return appointments.filter(
    (a) =>
      (buscado === '' || sinTildes(nombre(counterpart(a))).includes(buscado)) &&
      inPeriod(a, filters.period, now) &&
      (filters.status === 'todos' || ESTADOS[filters.status].includes(a.status)),
  );
}

export interface AgendaSection {
  key: string;
  title: string;
  /** `upcoming`: tarjetas con acciones. `history`: filas compactas de un mes. */
  kind: 'upcoming' | 'history';
  data: Appointment[];
}

function finDe(a: Appointment): number {
  return Date.parse(a.scheduledAt) + a.durationMinutes * 60_000;
}

/**
 * "Próximos" con los vigentes que todavía no terminaron, del más cercano al más
 * lejano, y después un grupo por mes con el resto. Un turno cancelado de la
 * semana que viene va a su mes y no a "Próximos": no se va a realizar.
 */
export function agendaSections(
  appointments: Appointment[],
  now: Date = new Date(),
): AgendaSection[] {
  const ahora = now.getTime();
  const vigente = (a: Appointment) => isActive(a) && finDe(a) > ahora;
  const proximos = appointments
    .filter(vigente)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const resto = appointments
    .filter((a) => !vigente(a))
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));

  const secciones: AgendaSection[] = [];
  if (proximos.length > 0) {
    secciones.push({ key: 'proximos', title: 'Próximos', kind: 'upcoming', data: proximos });
  }
  for (const turno of resto) {
    const mes = turno.date.slice(0, 7);
    const ultima = secciones[secciones.length - 1];
    if (ultima?.key === mes) ultima.data.push(turno);
    else secciones.push({ key: mes, title: formatMonthYear(mes), kind: 'history', data: [turno] });
  }
  return secciones;
}
