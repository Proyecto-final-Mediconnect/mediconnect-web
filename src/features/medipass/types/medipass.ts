/**
 * Tipos del MediPass (EP-05): el contrato de la API que consume la web
 * (ENG-135; ENG-72, ENG-73, ENG-103, ENG-104).
 */

/**
 * El bloque vital, que es lo único que se muestra sin autorización expresa.
 *
 * Lo arma el backend (`toVitalBlock`, ENG-103) con los campos de ENG-134. Los
 * opcionales son los que un paciente puede no tener cargados todavía: la
 * pantalla los omite en vez de mostrar "undefined" frente a un médico.
 */
export interface VitalBlock {
  nombre: string;
  edad?: number | null;
  sexo?: string | null;
  grupoSanguineo?: string | null;
  pais?: string | null;
  alergias?: { que: string; gravedad: string }[] | null;
  medicacion?: { droga: string; dosis: string; nota?: string | null }[] | null;
  condiciones?: { nombre: string; codigo: string }[] | null;
  contacto?: { nombre: string; vinculo: string; telefono: string } | null;
}

/* Contrato de la API del MediPass (ENG-135; ENG-72, ENG-73, ENG-103, ENG-104). */

/** `GET /medipass/me`: el código vigente del paciente. */
export interface MediPassCode {
  codigo: string;
  /** ISO-8601: cuándo deja de valer y hay que pedir el siguiente. */
  expiraEl: string;
}

/** `POST /medipass/sessions` (público): lo que manda quien escanea. */
export interface OpenEmergencySessionInput {
  codigo: string;
  nombre: string;
  matricula?: string;
}

/** Respuesta de `POST /medipass/sessions`. */
export interface EmergencySession {
  sesionId: string;
  expiraEl: string;
  vital: VitalBlock;
}

/** `GET /medipass/sessions/:id`: la sesión sigue viva; 410 si venció. */
export interface EmergencySessionStatus {
  expiraEl: string;
  vital: VitalBlock;
}

/** Estado de un acceso visto desde hoy (ENG-76). */
export type MediPassAccessStatus = 'ACTIVO' | 'VENCIDO' | 'REVOCADO';

/** Un acceso de un consultante al MediPass, con lo que miró. */
export interface MediPassAccess {
  sesionId: string;
  consultante: { nombre: string | null; matricula: string | null };
  /** ISO-8601. */
  inicio: string;
  vence: string;
  revocadoEl: string | null;
  estado: MediPassAccessStatus;
  vistas: { recurso: string | null; etiqueta: string; el: string }[];
}

/** `GET /medipass/me/historial?pagina=N`: una página, del más reciente al más viejo. */
export interface MediPassHistory {
  accesos: MediPassAccess[];
  pagina: number;
  hayMas: boolean;
}
