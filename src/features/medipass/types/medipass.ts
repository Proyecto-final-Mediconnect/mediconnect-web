/**
 * Tipos del MediPass (EP-05).
 *
 * **Las tablas YA EXISTEN en el schema**: `medipass_codes` (código de 8
 * caracteres con `expires_at` y `used_at`), `medipass_sessions` (con
 * `consultant_name`, `consultant_license`, `expires_at`, `revoked_at` y
 * `revoked_by`) y `medipass_access_logs` (`resource_accessed`, `accessed_at`).
 * Lo que no existe es el service ni el controller: no hay una sola ruta HTTP.
 *
 * Estos tipos espejan esas tablas, no una invención, así que cuando ENG-72 a
 * ENG-76 las expongan el mapeo debería ser directo.
 */

/**
 * Qué parte de la historia clínica ve quien accede.
 *
 * El paciente decide bloque por bloque, y el orden importa: va de lo que salva
 * una vida a lo que es privacidad pura. Un médico de guardia necesita el primero;
 * el último no lo necesita nadie sin autorización expresa.
 */
export type EmergencyScope =
  | 'VITAL'
  | 'CONDICIONES'
  | 'NOTAS'
  | 'ESTUDIOS';

export interface EmergencyScopeOption {
  id: EmergencyScope;
  label: string;
  detalle: string;
  /** No se puede apagar: es el mínimo que justifica que el MediPass exista. */
  fijo?: boolean;
}

/**
 * Un acceso otorgado a alguien. Espeja `medipass_sessions`.
 *
 * `expiraEl` no es decorativo: es la columna `expires_at`, y ENG-104 pide que las
 * sesiones expiren solas a los 30 minutos. Un acceso a una historia clínica que
 * no vence es una llave perdida.
 *
 * `revocadoEl` existe en la tabla (`revoked_at`) y acá se modela como opcional
 * por lo mismo que allá: revocar no borra la sesión, la marca. Un acceso que
 * desaparece de la lista al revocarlo no deja rastro de que existió.
 */
export interface MediPassAccess {
  id: string;
  /** `consultant_name`. Un profesional de la plataforma o un consultante externo. */
  quien: string;
  /** Dónde y cómo entró, para que el paciente lo reconozca. */
  contexto: string;
  /** `started_at`, ISO-8601. */
  desde: string;
  /** `expires_at`, ISO-8601: cuándo se corta solo. */
  expiraEl: string;
  /** `revoked_at`, si el paciente lo cortó antes de tiempo. */
  revocadoEl?: string | null;
  /** `consultant_license`, cuando el consultante es externo. */
  matricula?: string | null;
  alcance: EmergencyScope[];
}

/** El bloque vital, que es lo único que se muestra sin autorización expresa. */
export interface VitalBlock {
  nombre: string;
  edad: number;
  sexo: string;
  grupoSanguineo: string;
  pais: string;
  alergias: { que: string; gravedad: string }[];
  medicacion: { droga: string; dosis: string; nota?: string }[];
  condiciones: { nombre: string; codigo: string }[];
  contacto: { nombre: string; vinculo: string; telefono: string };
}
