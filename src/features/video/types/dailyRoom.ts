/**
 * Acceso a la sala de la videoconsulta de un turno (ENG-56).
 *
 * Viene **una sola** URL: la del rol de quien pidió entrar. El backend decide si es paciente o profesional leyendo el turno;
 * el navegador no elige.
 */
export interface VideoConsultationAccess {
  appointmentId: string;
  /** La consulta del turno: la evolución se asocia a ella (ENG-191). */
  consultationId: string;
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

/** `POST /video/test-room`: la sala de prueba de cámara y micrófono, solo para quien la pidió. */
export interface TestRoom {
  /** URL de la sala con el meeting token. Es efímera: no se guarda en ningún lado. */
  url: string;
  /** ISO-8601. A los diez minutos Daily cierra la sala. */
  expiraEl: string;
}
