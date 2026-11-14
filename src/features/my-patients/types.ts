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
  /** Años cumplidos; `null` si no cargó la fecha de nacimiento. */
  age: number | null;
  /** Primera consulta completada con este profesional: "paciente desde". */
  firstConsultation: AppointmentMoment | null;
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

/** Columna por la que se ordena. */
export type MyPatientsOrder =
  | 'ULTIMA_CONSULTA'
  | 'PROXIMO_TURNO'
  | 'CONSULTAS'
  | 'PACIENTE_DESDE'
  | 'NOMBRE';

export type SortDir = 'asc' | 'desc';

/** Búsqueda, filtros y orden: recortan la tabla y el Excel por igual. */
export interface MyPatientsFilters {
  q: string;
  orden: MyPatientsOrder;
  dir: SortDir;
  proximo?: 'CON_PROXIMO' | 'SIN_PROXIMO';
  ultima?: '30D' | '90D' | 'MAS_DE_6M' | 'NUNCA';
}
