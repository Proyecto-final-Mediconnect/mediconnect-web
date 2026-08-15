/** Sala de prueba de Daily creada por el backend (ENG-51). */
export interface SpikeRoom {
  /** Nombre de la sala en Daily. Es la clave para pedir métricas y borrarla. */
  name: string;
  /** URL base, sin token. No sirve para entrar: la sala es privada. */
  url: string;
  /** ISO-8601. Cuando llega, Daily expulsa a todos y cierra la sala. */
  expiresAt: string;
  /** URL con el meeting token del profesional (entra como owner). */
  professionalUrl: string;
  /** URL con el meeting token del paciente. */
  patientUrl: string;
  maxParticipants: number;
}

/** Resumen de una sesión ya terminada, tal como lo devuelve el backend. */
export interface MeetingSession {
  id: string;
  room: string;
  startTime: string;
  durationSeconds: number;
  participants: number;
  /** Minutos de participante: es la unidad que factura Daily. */
  participantMinutes: number;
}
