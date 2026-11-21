import { awaitsPatientChoice, isActive } from '../../appointments/lib/myAppointments';
import { formatDate, todayAR } from '../../appointments/lib/weeks';
import type { Appointment, AppointmentParty } from '../../appointments/types/appointment';
import type { PatientProfile } from '../../patient-profile/types/patientProfile';
import type { ProfessionalProfile } from '../../profile/types/professionalProfile';
import type { Schedule } from '../../schedule/types/schedule';
import { firstJoinable, joinWindowFor } from '../../video/lib/joinWindow';

/**
 * Lógica de los paneles por rol (ENG-44).
 *
 * Va separada del componente por el mismo motivo que `myAppointments.ts`: son
 * reglas —qué le falta a cada usuario para poder operar— y se testean sin montar
 * React.
 *
 * El panel dejó de ser una grilla de accesos directos. Un menú de secciones ya
 * lo da la barra lateral; lo que el panel tiene que responder es **qué me falta
 * y qué sigue**. Estas funciones calculan justamente eso.
 */

/**
 * Algo que el usuario tiene que resolver para poder usar la plataforma.
 *
 * `blocker` significa que hay una operación que hoy le está negada, no que sea
 * "importante": perfil incompleto ⇒ el backend responde 409 al reservar, precio
 * sin publicar ⇒ nadie puede reservarle. Un `warning` no impide nada, solo deja
 * el perfil pobre.
 */
export interface PendingTask {
  id: string;
  title: string;
  detail: string;
  severity: 'blocker' | 'warning';
  /** Adónde se va a resolver. `null` cuando no depende del usuario. */
  to: string | null;
  cta?: string;
}

/**
 * El próximo turno vigente.
 *
 * Se filtra por `isActive` a propósito: un turno cancelado de mañana sigue
 * apareciendo en "Mis turnos" (ahí interesa saber que se canceló), pero no es
 * "tu próxima consulta". Se compara por instante (`scheduledAt`) y no por
 * `date`/`startTime`, que ya son hora local formateada.
 */
export function nextAppointment(
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment | null {
  const futuros = appointments
    .filter((a) => isActive(a) && new Date(a.scheduledAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return futuros[0] ?? null;
}

/**
 * La consulta en curso (sala abierta) o, si no hay, la próxima (ENG-207).
 *
 * `nextAppointment` solo mira turnos que todavía no empezaron: a las 10:05 la
 * consulta de las 10:00 desaparecía del panel justo cuando hay que entrar. El
 * menú lateral ya resolvía así su atajo a la videoconsulta.
 */
export function currentOrNextAppointment(
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment | null {
  return firstJoinable(appointments, now) ?? nextAppointment(appointments, now);
}

/** Cuántos días mira el resumen de próximos turnos: hoy y los seis que siguen. */
export const UPCOMING_DAYS = 7;

export interface UpcomingDay {
  /** `YYYY-MM-DD`, fecha local del turno. */
  date: string;
  /** "Hoy", "Mañana" o "jueves 20 de agosto". */
  label: string;
  appointments: Appointment[];
}

export interface UpcomingAgenda {
  /** El pantallazo: turnos vigentes de hoy, de mañana y de los 7 días. */
  counts: { today: number; tomorrow: number; week: number };
  /** Los turnos de los 7 días agrupados por día. */
  days: UpcomingDay[];
  /** Turnos vigentes después de los 7 días. */
  later: number;
  /** Turnos que el profesional no pudo dar y esperan que el paciente elija
   *  otro horario o el reembolso (ENG-204/237), del plazo más cercano al más
   *  lejano. */
  awaitingPatient: Appointment[];
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "Hoy", "Mañana" o el día con nombre: "jueves 20 de agosto". */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Hoy';
  if (date === addDays(today, 1)) return 'Mañana';
  return `${weekdayOf(date)} ${formatDate(date)}`;
}

/**
 * Los próximos turnos del profesional, para el panel (ENG-207).
 *
 * Un turno sigue "por venir" hasta que se cierra su sala, no hasta su horario de
 * inicio: una consulta empezada hace cinco minutos todavía se atiende. Los días
 * se cuentan en el calendario argentino, como la agenda del backend, para que
 * "Hoy" no dependa del huso del navegador.
 */
export function upcomingAgenda(
  appointments: Appointment[],
  now: Date = new Date(),
): UpcomingAgenda {
  const today = todayAR(now);
  const tomorrow = addDays(today, 1);
  const lastDay = addDays(today, UPCOMING_DAYS - 1);

  const vigentes = appointments
    .filter((a) => isActive(a) && joinWindowFor(a).closesAt.getTime() > now.getTime())
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const week = vigentes.filter((a) => a.date <= lastDay);

  const days: UpcomingDay[] = [];
  for (const a of week) {
    let day = days.at(-1);
    if (day?.date !== a.date) {
      day = { date: a.date, label: dayLabel(a.date, today), appointments: [] };
      days.push(day);
    }
    day.appointments.push(a);
  }

  // Con el plazo vencido el job ya lo reembolsa: no espera nada del paciente.
  const awaitingPatient = appointments
    .filter(
      (a) =>
        awaitsPatientChoice(a) &&
        (!a.reprogramDeadline || Date.parse(a.reprogramDeadline) > now.getTime()),
    )
    .sort(
      (a, b) =>
        Date.parse(a.reprogramDeadline ?? a.scheduledAt) -
        Date.parse(b.reprogramDeadline ?? b.scheduledAt),
    );

  return {
    counts: {
      today: week.filter((a) => a.date === today).length,
      tomorrow: week.filter((a) => a.date === tomorrow).length,
      week: week.length,
    },
    days,
    later: vigentes.length - week.length,
    awaitingPatient,
  };
}

/** Consultas que ya se dieron. `COMPLETADO` lo marca el backend al cerrarlas. */
export function completedCount(appointments: Appointment[]): number {
  return appointments.filter((a) => a.status === 'COMPLETADO').length;
}

/**
 * Qué le falta al paciente.
 *
 * Hoy es una sola cosa, pero devuelve lista porque el panel la renderiza igual
 * que la del profesional y porque ENG-59 (historia clínica) va a sumar la suya.
 */
export function patientTasks(
  profile: PatientProfile | undefined,
  appointments: Appointment[] = [],
): PendingTask[] {
  const tasks: PendingTask[] = [];

  if (profile && !profile.completed) {
    tasks.push({
      id: 'perfil',
      title: 'Completá tus datos personales',
      // No es una recomendación: la fila en `patients` nace al guardar este
      // formulario, y sin ella `POST /appointments` responde 409.
      detail: 'Sin nombre, DNI y fecha de nacimiento no vas a poder reservar un turno.',
      severity: 'blocker',
      to: '/perfil/paciente',
      cta: 'Completar perfil',
    });
  }

  // ENG-204: un turno que el profesional canceló espera que el paciente elija.
  // Va arriba de todo en el panel: tiene plazo, y si vence se reembolsa solo.
  for (const a of appointments.filter(awaitsPatientChoice)) {
    const pro = a.professional ? `${a.professional.firstName} ${a.professional.lastName}` : null;
    tasks.push({
      id: `reprogramar-${a.id}`,
      title: `${pro ?? 'Tu profesional'} canceló tu turno del ${formatDate(a.date)}`,
      detail: 'Elegí qué hacer: podés pedir el reembolso del 100 %. No perdés lo que pagaste.',
      severity: 'warning',
      to: `/turnos/${a.id}`,
      cta: 'Elegir',
    });
  }

  return tasks;
}

/** Texto del estado de matrícula, cuando no está validada. */
const ESTADO_MATRICULA: Record<string, { title: string; detail: string }> = {
  PENDIENTE_VALIDACION_MATRICULA: {
    title: 'Tu matrícula está en validación',
    detail:
      'El equipo de MediConnect la revisa a mano. Hasta que la aprobemos, tu perfil no aparece en el catálogo y nadie puede reservarte.',
  },
  RECHAZADO: {
    title: 'Tu matrícula fue rechazada',
    detail: 'Escribinos para revisar el caso. Tu perfil no aparece en el catálogo.',
  },
  SUSPENDIDO: {
    title: 'Tu cuenta está suspendida',
    detail: 'Tu perfil no aparece en el catálogo y no podés recibir turnos nuevos.',
  },
};

/**
 * Qué le falta al profesional para poder recibir turnos.
 *
 * Las tres primeras son condiciones reales del backend, no consejos: el catálogo
 * filtra `status = 'VALIDADO'`, la reserva rechaza un profesional sin precio, y
 * sin franjas la disponibilidad devuelve una semana vacía.
 */
export function professionalTasks(
  profile: ProfessionalProfile | undefined,
  schedule: Schedule | undefined,
): PendingTask[] {
  const tasks: PendingTask[] = [];
  if (!profile) return tasks;

  const estado = ESTADO_MATRICULA[profile.status];
  if (estado) {
    tasks.push({
      id: 'matricula',
      ...estado,
      severity: 'blocker',
      // No hay pantalla donde resolverlo: la valida el equipo a mano, no el
      // profesional. Un botón acá sería mentira.
      to: null,
    });
  }

  if (profile.consultationPrice === null) {
    tasks.push({
      id: 'precio',
      title: 'Publicá tu precio de consulta',
      detail: 'Sin precio publicado, el botón de reservar aparece deshabilitado.',
      severity: 'blocker',
      to: '/perfil',
      cta: 'Cargar precio',
    });
  }

  if (schedule && schedule.rules.length === 0) {
    tasks.push({
      id: 'agenda',
      title: 'Definí tus horarios de atención',
      detail: 'Tu agenda está vacía: no se genera ningún turno para reservar.',
      severity: 'blocker',
      to: '/profesional/agenda',
      cta: 'Configurar agenda',
    });
  }

  if (profile.specialties.length === 0) {
    tasks.push({
      id: 'especialidades',
      title: 'Elegí tus especialidades',
      detail: 'Los pacientes filtran el catálogo por especialidad.',
      severity: 'warning',
      to: '/perfil',
      cta: 'Editar perfil',
    });
  }

  if (!profile.bio?.trim()) {
    tasks.push({
      id: 'bio',
      title: 'Escribí tu bio',
      detail: 'Es lo primero que se lee en tu perfil público.',
      severity: 'warning',
      to: '/perfil',
      cta: 'Editar perfil',
    });
  }

  return tasks;
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El día de la semana de una fecha local `YYYY-MM-DD`. */
function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * El subtítulo del panel: "Tu próxima consulta es el lunes 27 de octubre a las
 * 10:00", como en la app. El profesional suma con quién (`con`). Si ya empezó
 * (la tarjeta muestra la consulta en curso, ENG-207) y se pasa `now`, lo dice.
 */
export function nextPhrase(
  appointment: Appointment | null,
  con?: string | null,
  now?: Date,
): string {
  if (!appointment) return 'No tenés consultas agendadas.';
  const quien = con ? `, con ${con}` : '';
  if (now && Date.parse(appointment.scheduledAt) <= now.getTime()) {
    return `Tu consulta de las ${appointment.startTime}${con ? ` con ${con}` : ''} está en curso.`;
  }
  const weekday = weekdayOf(appointment.date);
  return `Tu próxima consulta es el ${weekday} ${formatDate(appointment.date)} a las ${appointment.startTime}${quien}.`;
}

/**
 * Con quién ya hubo una consulta, del más reciente al más viejo y sin repetir:
 * los profesionales en el panel del paciente y los pacientes en el del
 * profesional. `pick` elige la contraparte.
 */
export function recentCounterparts(
  appointments: Appointment[],
  now: Date,
  pick: (a: Appointment) => AppointmentParty | null | undefined,
  limit = 3,
): { party: AppointmentParty; lastDate: string }[] {
  const seen = new Map<string, { party: AppointmentParty; lastDate: string }>();
  appointments
    .filter((a) => a.status === 'COMPLETADO' && Date.parse(a.scheduledAt) < now.getTime())
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
    .forEach((a) => {
      const party = pick(a);
      if (party && !seen.has(party.id)) seen.set(party.id, { party, lastDate: a.date });
    });
  return [...seen.values()].slice(0, limit);
}
