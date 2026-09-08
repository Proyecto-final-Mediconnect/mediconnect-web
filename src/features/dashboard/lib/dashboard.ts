import { isActive } from '../../appointments/lib/myAppointments';
import type { Appointment } from '../../appointments/types/appointment';
import type { PatientProfile } from '../../patient-profile/types/patientProfile';
import type { ProfessionalProfile } from '../../profile/types/professionalProfile';
import type { Schedule } from '../../schedule/types/schedule';

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
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  return futuros[0] ?? null;
}

/** Turnos vigentes de acá en adelante. Es el número del panel. */
export function upcomingCount(
  appointments: Appointment[],
  now: Date = new Date(),
): number {
  return appointments.filter(
    (a) => isActive(a) && new Date(a.scheduledAt).getTime() > now.getTime(),
  ).length;
}

/** Consultas que ya se dieron. `COMPLETADO` lo marca el backend al cerrarlas. */
export function completedCount(appointments: Appointment[]): number {
  return appointments.filter((a) => a.status === 'COMPLETADO').length;
}

/**
 * Turnos dentro de los próximos 7 días. En el panel del profesional es la carga
 * de la semana, que es lo que mira antes que nada.
 */
export function withinNextWeek(
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment[] {
  const limite = now.getTime() + 7 * 24 * 60 * 60_000;

  return appointments.filter((a) => {
    const t = new Date(a.scheduledAt).getTime();
    return isActive(a) && t > now.getTime() && t <= limite;
  });
}

/**
 * Qué le falta al paciente.
 *
 * Hoy es una sola cosa, pero devuelve lista porque el panel la renderiza igual
 * que la del profesional y porque ENG-59 (historia clínica) va a sumar la suya.
 */
export function patientTasks(profile: PatientProfile | undefined): PendingTask[] {
  if (!profile || profile.completed) return [];

  return [
    {
      id: 'perfil',
      title: 'Completá tus datos personales',
      // No es una recomendación: la fila en `patients` nace al guardar este
      // formulario, y sin ella `POST /appointments` responde 409.
      detail: 'Sin nombre, DNI y fecha de nacimiento no vas a poder reservar un turno.',
      severity: 'blocker',
      to: '/perfil/paciente',
      cta: 'Completar perfil',
    },
  ];
}

/** Texto del estado de matrícula, cuando no está validada. */
const ESTADO_MATRICULA: Record<string, { title: string; detail: string }> = {
  PENDIENTE_VALIDACION_MATRICULA: {
    title: 'Tu matrícula está en validación',
    detail:
      'Un moderador la revisa a mano. Hasta que la aprueben, tu perfil no aparece en el catálogo y nadie puede reservarte.',
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
      // No hay pantalla donde resolverlo: depende de la moderación, no del
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
