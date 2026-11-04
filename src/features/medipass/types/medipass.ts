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

/**
 * `POST /medipass/sessions` (público): lo que manda quien escanea. Entra con el
 * código rotativo **o** con la tarjeta de emergencia (ENG-176), uno de los dos.
 */
export interface OpenEmergencySessionInput {
  codigo?: string;
  tarjeta?: string;
  nombre: string;
  matricula?: string;
}

/** Por dónde entró un consultante: el código rotativo o la tarjeta (ENG-176). */
export type MediPassOrigin = 'CODIGO' | 'TARJETA';

/** `GET /medipass/me/emergency-card`: si hay una tarjeta activa. Nunca el token. */
export interface EmergencyCardStatus {
  activa: boolean;
  /** ISO-8601, o `null` sin tarjeta. */
  creadaEl: string | null;
}

/**
 * `POST /medipass/me/emergency-card`: la tarjeta recién generada. Es la única
 * vez que el token sale del backend, que solo guarda su hash.
 */
export interface EmergencyCardCreated {
  tarjeta: string;
  creadaEl: string;
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
  /** Opcional por compatibilidad con un backend anterior a ENG-176. */
  origen?: MediPassOrigin;
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

/**
 * Un acceso abierto ahora sobre el MediPass (`GET /medipass/me/accesses`,
 * ENG-74). El backend ya deja afuera los vencidos y los revocados.
 */
export interface MediPassActiveAccess {
  /** El id de la sesión: es lo que se manda para cortarla (ENG-75). */
  id: string;
  consultante: string;
  matricula: string | null;
  /** ISO-8601. */
  desde: string;
  /** ISO-8601: cuándo se corta sola. */
  expiraEl: string;
  minutosRestantes: number;
  /** Opcional por compatibilidad con un backend anterior a ENG-176. */
  origen?: MediPassOrigin;
}

/**
 * Qué bloques ve un consultante externo (`GET`/`PUT /medipass/me/scope`,
 * ENG-149). Sin configurar, todos. El nombre y la edad siempre se ven.
 */
export interface MediPassScope {
  grupoSanguineo: boolean;
  alergias: boolean;
  medicacion: boolean;
  condiciones: boolean;
  contacto: boolean;
}
