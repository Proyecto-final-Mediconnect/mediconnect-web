/** Un turno ubicado en el tiempo: el instante y cómo se lee en Argentina. */
export interface AppointmentMoment {
  /** ISO-8601, UTC. */
  at: string;
  /** `YYYY-MM-DD` en Argentina. */
  date: string;
  /** `HH:mm` en Argentina. */
  startTime: string;
}

/** Espeja `GET /professionals/me/patients` (ENG-197). Ningún dato clínico. */
export interface MyPatientRow {
  patientId: string;
  firstName: string;
  lastName: string;
  /** Último turno completado con este profesional. */
  lastConsultation: AppointmentMoment | null;
  /** Próximo turno confirmado o sin pagar que todavía no pasó. */
  nextAppointment: AppointmentMoment | null;
  /** Consultas completadas con este profesional. */
  consultations: number;
}

export interface MyPatientsView {
  rows: MyPatientRow[];
  pagina: number;
  hayMas: boolean;
  /** Pacientes que cumplen la búsqueda, en todas las páginas. */
  total: number;
}
