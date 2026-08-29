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

/**
 * Acceso a la sala de la videoconsulta de un turno (ENG-56).
 *
 * A diferencia de `SpikeRoom`, acá viene **una sola** URL: la del rol de quien
 * pidió entrar. El backend decide si es paciente o profesional leyendo el turno;
 * el navegador no elige.
 */
export interface VideoConsultationAccess {
  appointmentId: string;
  role: 'PACIENTE' | 'PROFESIONAL';
  /** URL de la sala con el meeting token. Es efímera: no se guarda en ningún lado. */
  roomUrl: string;
  /** ISO-8601. Cuando llega, Daily cierra la sala y expulsa a todos. */
  expiresAt: string;
  /** La otra persona de la consulta. `null` si no tiene el perfil cargado. */
  counterpart: { firstName: string; lastName: string } | null;
  recording: {
    /** Si el audio de esta consulta se está grabando. */
    enabled: boolean;
    mode: 'off' | 'cloud-audio-only';
  };
}
